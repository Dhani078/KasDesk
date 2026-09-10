/**
 * Real OCR test with the generated receipt image.
 * Uses mysql2 (already in project) and bcryptjs.
 * Run: node scripts/test-ocr-real.js
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
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

const receiptPath = path.join(__dirname, '..', 'test_receipt.png')
if (!fs.existsSync(receiptPath)) {
  console.error('test_receipt.png not found at', receiptPath)
  process.exit(1)
}

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `ocr-real-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '120', ...args], { encoding: 'utf8', env })
}
function curlWithStatus(args) {
  const out = execFileSync('curl', ['-s', '-i', '-b', jar, '-c', jar, '--max-time', '120', ...args], { encoding: 'utf8', env })
  // -i includes headers in output, body follows after \r\n\r\n
  const statusLine = out.split(/\r?\n/).find(l => /^HTTP\//.test(l))
  const status = statusLine ? parseInt(statusLine.split(' ')[1], 10) : 0
  const bodyStart = out.indexOf('\r\n\r\n')
  const body = bodyStart >= 0 ? out.slice(bodyStart + 4) : out
  return { status, body }
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

const EMAIL = `ocrreal-${Date.now()}@example.com`
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
    [uid, 'OCR Real Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )

  console.log('=== Real OCR call with generated receipt ===')
  check('login', await login(EMAIL, PW))

  const resp = curlWithStatus(['-X', 'POST', '-F', `image=@${receiptPath};type=image/png`, `${BASE}/api/scan-receipt`])
  check('HTTP 200', resp.status === 200, `got ${resp.status}`)

  let data
  try {
    data = JSON.parse(resp.body.trim().split(/\r?\n/).pop() || '{}')
  } catch (e) {
    console.error('Failed to parse JSON:', resp.body.slice(0, 500))
    check('valid JSON', false, resp.body.slice(0, 200))
    data = {}
  }

  if (data.error) {
    console.log('API returned error:', JSON.stringify(data, null, 2))
    check('no error from API', false, data.error)
  } else {
    check('merchant_name present', typeof data.merchant_name === 'string' && data.merchant_name.length > 0, data.merchant_name)
    check('items is array', Array.isArray(data.items), JSON.stringify(data.items))
    check('detected_total present', typeof data.detected_total === 'number', data.detected_total)
    check('confidence_score present', typeof data.confidence_score === 'number', data.confidence_score)
    check('detected_category present', typeof data.detected_category === 'string', data.detected_category)
    check('needs_confirmation boolean', typeof data.needs_confirmation === 'boolean', data.needs_confirmation)

    // Print the full result for inspection
    console.log('\n--- OCR RESULT ---')
    console.log(JSON.stringify(data, null, 2))
  }

  await db.execute('DELETE FROM users WHERE id=?', [uid])
  await db.end()

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })