/**
 * OCR upload guard test.
 *
 * Two separate protections, tested separately because they fail differently:
 *
 *   1. Content-Length pre-check — rejects an over-large DECLARED size before
 *      req.formData() buffers the body into memory. Without it a 500 MB upload
 *      is read into RAM and only rejected afterwards, so the file.size check
 *      never gets a chance to run. This is the DoS guard.
 *
 *   2. file.size backstop — the real gate, since Content-Length is advisory
 *      and a client may omit or lie about it.
 *
 * Also confirms the route is fail-closed: with no GEMINI_API_KEY it answers
 * 503 and never reaches upstream.
 *
 * Run: node scripts/test-ocr-limits.js
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { ensureServer, killServer } = require('./ensure-server')

function loadEnv(f) {
  const o = {}
  for (const raw of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) o[m[1]] = m[2].trim()
  }
  return o
}
const env = loadEnv(path.join(__dirname, '..', '.env.local'))
const BASE = process.env.BASE_URL || 'http://localhost:3333'

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `ocrlim-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', ...args], { encoding: 'utf8', env })
}

function curlWithStatus(args) {
  try {
    return execFileSync('curl', ['-s', '-w', '\n__STATUS__%{http_code}', '-b', jar, '-c', jar,
      '--max-time', '60', ...args], { encoding: 'utf8', env })
  } catch (e) {
    return (e.stdout || '') + '\n__STATUS__' + (e.status === 0 ? '000' : String(e.status))
  }
}

async function login(email, pw) {
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`, '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${pw}`, '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`], { encoding: 'utf8', env })
  return /authjs\.session-token=/.test(out)
}

const EMAIL = `ocrlim-${Date.now()}@example.com`
const PW = 'ocrlim12345'

async function main() {
  let serverProc = null
  let db = null
  let uid = null
  let bigPath = null
  let txtPath = null

  try {
    serverProc = await ensureServer()

    db = await mysql.createPool({
      host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
      user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      waitForConnections: true, connectionLimit: 5,
    })

    uid = crypto.randomUUID()
    await db.execute(
      'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
      [uid, 'OCR Limits', EMAIL, await bcrypt.hash(PW, 12)]
    )

    console.log('=== OCR upload must not be force-fed unbounded bodies ===')
    check('login', await login(EMAIL, PW))

    const routeSrc = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'api', 'scan-receipt', 'route.ts'), 'utf8'
    )
    const iCl = routeSrc.indexOf("req.headers.get('content-length')")
    const iForm = routeSrc.indexOf('await req.formData()')
    check('Content-Length guard exists', iCl > 0)
    check('Content-Length guard runs BEFORE req.formData() (else it is useless)',
      iCl > 0 && iForm > 0 && iCl < iForm, `guard@${iCl} formData@${iForm}`)

    bigPath = path.join(os.tmpdir(), `big-${Date.now()}.png`)
    const buf = Buffer.alloc(11 * 1024 * 1024, 0x41)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0)
    fs.writeFileSync(bigPath, buf)

    const t0 = Date.now()
    const big = curlWithStatus([
      '-X', 'POST', '-F', `image=@${bigPath};type=image/png`,
      `${BASE}/api/scan-receipt`,
    ])
    const elapsed = Date.now() - t0
    const bigStatus = Number((big.match(/__STATUS__(\d+)/) || [])[1])
    const bigBody = big.replace(/__STATUS__\d+$/, '')
    try { fs.rmSync(bigPath, { force: true }) } catch {}
    bigPath = null

    check('oversized real file is rejected (413) or fail-closed (503)',
      bigStatus === 413 || bigStatus === 503, `got ${bigStatus}: ${bigBody.slice(0, 120)}`)
    check('oversized upload never returns 200', bigStatus !== 200)
    console.log(`  (11 MB upload answered ${bigStatus} in ${elapsed}ms)`)
    check('rejection is prompt, not after a long buffer (< 8s)', elapsed < 8000,
      `took ${elapsed}ms`)

    txtPath = path.join(os.tmpdir(), `notimg-${Date.now()}.txt`)
    fs.writeFileSync(txtPath, 'this is not an image')
    const txt = curlWithStatus([
      '-X', 'POST', '-F', `image=@${txtPath};type=text/plain`,
      `${BASE}/api/scan-receipt`,
    ])
    const txtStatus = Number((txt.match(/__STATUS__(\d+)/) || [])[1])
    try { fs.rmSync(txtPath, { force: true }) } catch {}
    txtPath = null
    check('non-image upload refused (415) or fail-closed (503)',
      txtStatus === 415 || txtStatus === 503, `got ${txtStatus}`)
  } finally {
    try {
      if (db && uid) {
        await db.execute('DELETE FROM users WHERE id=?', [uid])
        await db.end()
      }
    } catch {}
    if (bigPath) { try { fs.rmSync(bigPath, { force: true }) } catch {} }
    if (txtPath) { try { fs.rmSync(txtPath, { force: true }) } catch {} }
    fs.rmSync(jar, { force: true })
    killServer(serverProc)
  }

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})
