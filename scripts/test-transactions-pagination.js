/**
 * Test Transactions Cursor Pagination & Resilient Query Parsing.
 *
 * Verifies (PROMPT-ANTIGRAVITY.md §Transaksi):
 *   1. Normal load with >30 transactions paginates at PAGE_SIZE=30.
 *   2. Next-page link carries valid base64url cursor.
 *   3. Second page renders the remaining transactions.
 *   4. Corrupt cursor (malformed base64url, non-date ISO) does not crash (HTTP 200).
 *   5. Corrupt date filters (?from=invalid&to=corrupted) do not crash (HTTP 200).
 *
 * Run: node scripts/test-transactions-pagination.js
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

const jar = path.join(os.tmpdir(), `tx-test-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '45', ...args], { encoding: 'utf8', env })
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
  console.log('=== Transactions Cursor Pagination & Resilient Query Tests ===')

  // 1. Setup isolated user and wallet
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  const uid = crypto.randomUUID()
  const wid = crypto.randomUUID()
  const EMAIL = `tx-page-${Date.now()}@example.com`
  const PW = 'password123'

  try {
    await db.execute(
      'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
      [uid, 'Tx Pagination Tester', EMAIL, await bcrypt.hash(PW, 12)]
    )
    await db.execute(
      'INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
      [wid, uid, 'Dompet Uji', 'cash', 10000000]
    )

    // Seed 35 distinct transactions
    const baseTime = Date.now() - 3600000 * 35
    for (let i = 1; i <= 35; i++) {
      const txId = crypto.randomUUID()
      const txTime = new Date(baseTime + i * 3600000)
      await db.execute(
        'INSERT INTO transactions (id,userId,walletId,type,amount,title,occurredAt,createdAt) VALUES (?,?,?,?,?,?,?,?)',
        [txId, uid, wid, 'expense', 10000, `Transaksi Uji #${String(i).padStart(2, '0')}`, txTime, txTime]
      )
    }

    const authed = await login(EMAIL, PW)
    check('login with isolated test user', authed)

    // 2. First page load: should render page with 30 transactions and pagination button
    const page1Html = curl([`${BASE}/transactions`])
    const uniquePage1 = new Set([...page1Html.matchAll(/Transaksi Uji #(\d+)/g)].map((m) => m[1]))
    check('page 1 caps at 30 items', uniquePage1.size === 30, `got ${uniquePage1.size}`)
    check('has "Berikutnya" or cursor pagination link', page1Html.includes('cursor=') || page1Html.includes('Berikutnya'))

    // Extract cursor parameter
    const cursorMatch = page1Html.match(/href="[^"]*[?&]cursor=([a-zA-Z0-9_-]+)/)
    check('cursor token found in HTML', Boolean(cursorMatch && cursorMatch[1]))
    const cursorToken = cursorMatch ? cursorMatch[1] : null

    // 3. Second page load using cursor
    if (cursorToken) {
      const page2Html = curl([`${BASE}/transactions?cursor=${cursorToken}`])
      const uniquePage2 = new Set([...page2Html.matchAll(/Transaksi Uji #(\d+)/g)].map((m) => m[1]))
      check('page 2 returns remaining 5 items', uniquePage2.size === 5, `got ${uniquePage2.size}`)
    } else {
      check('page 2 returns remaining 5 items', false, 'no cursor token')
    }

    // 4. Resilience: Corrupt cursor queries must not 500 crash
    const corrupt1 = curlStatus([`${BASE}/transactions?cursor=invalid_base64_!@#$`])
    check('corrupted base64 cursor does not crash (HTTP 200)', corrupt1 === '200', `got ${corrupt1}`)

    // base64url of "not-a-date|some-uuid"
    const fakeCursor = Buffer.from('not-a-date|some-uuid').toString('base64url')
    const corrupt2 = curlStatus([`${BASE}/transactions?cursor=${fakeCursor}`])
    check('invalid date in cursor does not crash (HTTP 200)', corrupt2 === '200', `got ${corrupt2}`)

    // 5. Resilience: Corrupt date filters (?from=invalid&to=corrupted)
    const corruptDate = curlStatus([`${BASE}/transactions?from=not-a-date&to=invalid-day`])
    check('invalid date filter does not crash (HTTP 200)', corruptDate === '200', `got ${corruptDate}`)

    const futureDate = curlStatus([`${BASE}/transactions?from=9999-99-99&to=0000-00-00`])
    check('impossible date ranges do not crash (HTTP 200)', futureDate === '200', `got ${futureDate}`)

  } finally {
    // Cleanup
    try {
      await db.execute('DELETE FROM transactions WHERE userId = ?', [uid])
      await db.execute('DELETE FROM wallets WHERE userId = ?', [uid])
      await db.execute('DELETE FROM users WHERE id = ?', [uid])
      fs.unlinkSync(jar)
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
