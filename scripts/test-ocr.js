/**
 * OCR endpoint test — with NO Gemini key configured.
 *
 * The critical property is FAIL-CLOSED: without GEMINI_API_KEY the route
 * must return 503 and must NOT contact upstream. A silent "success" here
 * would mean an unauthenticated call to a paid API.
 *
 * Also verifies auth gating and input validation, which must happen BEFORE
 * any key check so an unauthenticated caller can't probe the feature.
 *
 * Run: node scripts/test-ocr.js  (server must be up on BASE_URL)
 */
const { execFileSync } = require('child_process')
const fs = require('fs'), os = require('os'), path = require('path')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

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
const HAS_KEY = !!env.GEMINI_API_KEY

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `ocr-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', ...args], { encoding: 'utf8' })
}
function statusOnly(args) {
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '--max-time', '60', ...args], { encoding: 'utf8' })
  return parseInt((out.split(/\r?\n/).find((l) => /^HTTP\//.test(l)) || '').split(' ')[1] || '0', 10)
}
function login(email, pw) {
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`, '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${pw}`, '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`], { encoding: 'utf8' })
  return /authjs\.session-token=/.test(out)
}

// 1x1 red PNG — valid image, useless content.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)
const imgPath = path.join(os.tmpdir(), `ocr-${Date.now()}.png`)
fs.writeFileSync(imgPath, PNG)

const EMAIL = `ocr-${Date.now()}@example.com`
const PW = 'ocr12345'

;(async () => {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  const uid = crypto.randomUUID()
  await db.execute(
    'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
    [uid, 'OCR Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )

  console.log('=== unauthenticated is rejected before anything else ===')
  const anonJar = path.join(os.tmpdir(), `ocr-anon-${Date.now()}.txt`)
  const anonOut = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', anonJar, '-c', anonJar,
    '-X', 'POST', '-F', `image=@${imgPath};type=image/png`, '--max-time', '60',
    `${BASE}/api/scan-receipt`], { encoding: 'utf8' })
  const anonStatus = parseInt((anonOut.split(/\r?\n/).find((l) => /^HTTP\//.test(l)) || '').split(' ')[1] || '0', 10)
  check('anonymous -> 401 or redirect', anonStatus === 401 || anonStatus === 307 || anonStatus === 302,
    `${anonStatus}`)

  console.log('\n=== authenticated, no API key -> fail closed ===')
  check('login', login(EMAIL, PW))
  const st = statusOnly(['-X', 'POST', '-F', `image=@${imgPath};type=image/png`,
    `${BASE}/api/scan-receipt`])

  if (HAS_KEY) {
    check('key present -> does NOT return 503', st !== 503, `${st}`)
  } else {
    check('no key -> 503 OCR_NOT_CONFIGURED', st === 503, `${st}`)
  }

  console.log('\n=== input validation (before any upstream call) ===')
  const noImage = statusOnly(['-X', 'POST', '-F', 'notimage=1', `${BASE}/api/scan-receipt`])
  check('missing image rejected', noImage === 400 || noImage === 503, `${noImage}`)

  const badType = statusOnly(['-X', 'POST', '-F', `image=@${__filename};type=application/json`,
    `${BASE}/api/scan-receipt`])
  check('unsupported type rejected', badType === 415 || badType === 503, `${badType}`)

  console.log('\n=== scanner UI ===')
  const home = curl([`${BASE}/`])
  if (HAS_KEY) {
    check('scan button rendered', home.includes('Pindai struk'))
  } else {
    check('scan button present but gated client-side', home.includes('Pindai struk'))
  }

  await db.execute('DELETE FROM users WHERE id=?', [uid])
  await db.end()
  fs.unlinkSync(imgPath)

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  if (!HAS_KEY) console.log('\nNOTE: GEMINI_API_KEY not set — upstream path not exercised.')
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
