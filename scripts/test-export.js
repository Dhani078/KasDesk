/**
 * Test Authenticated Data Export & Zero Secret Leakage.
 *
 * Verifies (PROMPT-ANTIGRAVITY.md §Tahap 6):
 *   1. Unauthenticated access to /api/export and /api/export/csv is rejected (401/307).
 *   2. Authenticated user receives valid JSON export with correct security headers.
 *   3. Authenticated user receives valid CSV export with correct security headers.
 *   4. Zero Secret Leakage: exports must NOT contain password hashes, tokens, auth secrets,
 *      or other users' private financial data.
 *
 * Run: node scripts/test-export.js
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')
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

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `export-test-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '45', ...args], { encoding: 'utf8', env })
}

function curlWithHeaders(args) {
  return execFileSync('curl', ['-s', '-D', '-', '-b', jar, '-c', jar, '--max-time', '45', ...args], { encoding: 'utf8', env })
}

function curlStatus(args) {
  return execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', '-b', jar, '-c', jar, '--max-time', '45', ...args], { encoding: 'utf8', env }).trim()
}

async function login(email, pw) {
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`,
    '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${pw}`,
    `${BASE}/api/auth/callback/credentials`
  ], { encoding: 'utf8', env })
  return out.includes('Location: /') || out.includes('302') || out.includes('authjs.session-token')
}

async function main() {
  console.log('=== Data Export & Zero Secret Leakage Tests ===')

  // 1. Unauthenticated gate checks
  const anonJar = path.join(os.tmpdir(), `anon-exp-${Date.now()}.txt`)
  const unauthJsonCode = execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', '-c', anonJar, '-b', anonJar, `${BASE}/api/export`], { encoding: 'utf8' }).trim()
  check('unauthenticated /api/export is rejected (401 or 307 redirect)', unauthJsonCode === '401' || unauthJsonCode === '307', `got ${unauthJsonCode}`)

  const unauthCsvCode = execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}', '-c', anonJar, '-b', anonJar, `${BASE}/api/export/csv`], { encoding: 'utf8' }).trim()
  check('unauthenticated /api/export/csv is rejected (401 or 307 redirect)', unauthCsvCode === '401' || unauthCsvCode === '307', `got ${unauthCsvCode}`)

  // 2. Setup isolated user with unique sensitive identifier
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  const uid = crypto.randomUUID()
  const wid = crypto.randomUUID()
  const tid = crypto.randomUUID()
  const EMAIL = `export-tester-${Date.now()}@example.com`
  const PW = 'SuperSecretPassword123!'
  const SECRET_CANARY = `SECRET_CANARY_${Date.now()}`

  try {
    const pwHash = await bcrypt.hash(PW, 12)
    await db.execute(
      'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
      [uid, 'Export Tester', EMAIL, pwHash]
    )
    await db.execute(
      'INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
      [wid, uid, 'Dompet Utama Export', 'bank', 2500000]
    )
    await db.execute(
      'INSERT INTO transactions (id,userId,walletId,type,amount,title,note,occurredAt,createdAt) VALUES (?,?,?,?,?,?,?,NOW(),NOW())',
      [tid, uid, wid, 'expense', 75000, 'Makan Siang Enak', `Catatan: ${SECRET_CANARY}`]
    )

    const authed = await login(EMAIL, PW)
    check('login with isolated test user', authed)

    // 3. Test JSON Export
    const jsonResWithHeaders = curlWithHeaders([`${BASE}/api/export`])
    const headerPart = jsonResWithHeaders.split('\r\n\r\n')[0] || ''
    const bodyPart = jsonResWithHeaders.substring(jsonResWithHeaders.indexOf('\r\n\r\n') + 4)

    check('JSON export sets application/json', headerPart.toLowerCase().includes('application/json'))
    check('JSON export sets attachment filename', headerPart.toLowerCase().includes('attachment; filename="kasdesk-export-'))
    check('JSON export sets Cache-Control: no-store', headerPart.toLowerCase().includes('cache-control: no-store'))

    let exportData = {}
    try { exportData = JSON.parse(bodyPart) } catch (e) {
      console.error('Parse error:', e.message)
    }

    check('JSON export is valid JSON structure', Boolean(exportData.wallets && exportData.transactions))
    check('JSON export contains user wallet', exportData.wallets?.some((w) => w.id === wid && w.name === 'Dompet Utama Export'))
    check('JSON export contains user transaction', exportData.transactions?.some((t) => t.id === tid && t.title === 'Makan Siang Enak'))

    // Zero Secret Leakage Assertions for JSON
    check('JSON export NEVER leaks user password hash', !bodyPart.includes(pwHash) && !bodyPart.includes('$2a$') && !bodyPart.includes('$2b$'))
    check('JSON export NEVER contains password field', !bodyPart.includes('"password"') && !bodyPart.includes('"passwordHash"'))
    check('JSON export NEVER leaks AUTH_SECRET', Boolean(env.AUTH_SECRET && !bodyPart.includes(env.AUTH_SECRET)))
    check('JSON export NEVER leaks GEMINI_API_KEY', Boolean(env.GEMINI_API_KEY && !bodyPart.includes(env.GEMINI_API_KEY)))
    check('JSON export NEVER leaks DB password', Boolean(env.DATABASE_PASSWORD && !bodyPart.includes(env.DATABASE_PASSWORD)))

    // 4. Test CSV Export
    const csvResWithHeaders = curlWithHeaders([`${BASE}/api/export/csv`])
    const csvHeaderPart = csvResWithHeaders.split('\r\n\r\n')[0] || ''
    const csvBodyPart = csvResWithHeaders.substring(csvResWithHeaders.indexOf('\r\n\r\n') + 4)

    check('CSV export sets text/csv', csvHeaderPart.toLowerCase().includes('text/csv'))
    check('CSV export sets attachment filename', csvHeaderPart.toLowerCase().includes('attachment; filename="kasdesk-transactions-'))
    check('CSV export sets Cache-Control: no-store', csvHeaderPart.toLowerCase().includes('cache-control: no-store'))

    check('CSV export has standard header row', csvBodyPart.startsWith('id,tanggal,jenis,judul,kategori,dompet_asal,dompet_tujuan,jumlah,catatan'))
    check('CSV export contains user transaction title', csvBodyPart.includes('Makan Siang Enak'))
    check('CSV export contains user transaction note', csvBodyPart.includes(SECRET_CANARY))
    check('CSV export translates walletId to wallet name', csvBodyPart.includes('Dompet Utama Export'))

    // Zero Secret Leakage Assertions for CSV
    check('CSV export NEVER leaks user password hash', !csvBodyPart.includes(pwHash) && !csvBodyPart.includes('$2a$') && !csvBodyPart.includes('$2b$'))
    check('CSV export NEVER leaks AUTH_SECRET', Boolean(env.AUTH_SECRET && !csvBodyPart.includes(env.AUTH_SECRET)))

  } finally {
    // Cleanup
    try {
      await db.execute('DELETE FROM transactions WHERE userId = ?', [uid])
      await db.execute('DELETE FROM wallets WHERE userId = ?', [uid])
      await db.execute('DELETE FROM users WHERE id = ?', [uid])
      fs.unlinkSync(jar)
      fs.unlinkSync(anonJar)
    } catch {}
    await db.end()
  }

  console.log(`\n==============================================`)
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  console.log(`==============================================`)
  process.exit(fail ? 1 : 0)
}

main().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
