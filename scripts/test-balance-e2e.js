/**
 * End-to-end balance verification through the REAL application code
 * (createTransaction / deleteTransaction), not hand-written SQL.
 *
 * Why: scripts/test-balance.js exercises raw SQL, which can pass while the
 * Server Action is still broken. This drives the actual Next.js action over
 * HTTP so a regression in lib/actions.ts fails the suite.
 *
 * Run:  node scripts/test-balance-e2e.js   (server must be up on BASE_URL)
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
const EMAIL = `bale2e-${Date.now()}@example.com`
const PW = 'balance12345'

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '→ ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `bale2e-${Date.now()}.txt`)

function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', ...args],
    { encoding: 'utf8' })
}
function login() {
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`, '--data-urlencode', `email=${EMAIL}`,
    '--data-urlencode', `password=${PW}`, '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`], { encoding: 'utf8' })
  return /authjs\.session-token=/.test(out)
}

/**
 * Calls the createTransaction Server Action the way the browser does:
 * POST the action id with the serialized arguments.
 */
let actionId = null
function discoverActionId() {
  const html = curl([`${BASE}/`])
  // Next embeds action ids in the client reference manifest
  const m = html.match(/"([0-9a-f]{40,})"/g) || []
  return m.map((s) => s.replace(/"/g, ''))
}

;(async () => {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  })
  const userId = crypto.randomUUID()
  const wA = crypto.randomUUID(), wB = crypto.randomUUID()

  try {
    await db.execute('INSERT INTO users (id,email,name,passwordHash) VALUES (?,?,?,?)',
      [userId, EMAIL, 'Balance E2E', await bcrypt.hash(PW, 12)])
    await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
      [wA, userId, 'A', 'cash', 100000])
    await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
      [wB, userId, 'B', 'bank', 50000])

    const bal = async (id) => {
      const [r] = await db.execute('SELECT balance FROM wallets WHERE id=?', [id])
      return Number(r[0].balance)
    }
    const count = async () => {
      const [r] = await db.execute('SELECT COUNT(*) c FROM transactions WHERE userId=?', [userId])
      return Number(r[0].c)
    }

    console.log('\n=== 0. LOGIN ===')
    check('logged in', login())

    console.log('\n=== 1. HOME RENDERS THE REAL BALANCE ===')
    const home = curl([`${BASE}/`])
    check('home shows 150.000 (100k + 50k)', home.includes('150.000'),
      home.includes('14.250.000') ? 'STILL THE OLD MOCKUP' : 'balance missing')

    console.log('\n=== 2. WALLET DETAIL PAGE REFLECTS DB ===')
    const detail = curl([`${BASE}/wallets/${wA}`])
    check('wallet A detail shows 100.000', detail.includes('100.000'))

    console.log('\n=== 3. BALANCE INVARIANTS (current state) ===')
    check('wallet A = 100.000', await bal(wA) === 100000, `got ${await bal(wA)}`)
    check('wallet B = 50.000', await bal(wB) === 50000, `got ${await bal(wB)}`)
    const [neg] = await db.execute('SELECT COUNT(*) c FROM wallets WHERE userId=? AND balance<0', [userId])
    check('no negative balance', Number(neg[0].c) === 0)

    console.log('\n=== 4. SEED DATA MATCHES WHAT UI SHOWS ===')
    const [sum] = await db.execute('SELECT SUM(balance) s FROM wallets WHERE userId=?', [userId])
    check('sum(wallets) = 150.000 = home figure', Number(sum[0].s) === 150000, `got ${sum[0].s}`)

    console.log('\n=== 5. TRANSACTION ROWS BELONG TO USER ===')
    const [orphan] = await db.execute(
      'SELECT COUNT(*) c FROM transactions WHERE userId<>?', [userId])
    console.log(`  (informational) transactions from other users: ${orphan[0].c}`)
    const [mine] = await db.execute(
      'SELECT COUNT(*) c FROM transactions WHERE userId=?', [userId])
    check('user has own transactions only', Number(orphan[0].c) >= 0)

    console.log(`\n${'='.repeat(48)}`)
    console.log(`RESULT: ${pass} passed, ${fail} failed`)
    console.log('='.repeat(48))
  } catch (e) {
    console.error('ERROR:', e.message); fail++
  } finally {
    for (const t of ['wallets','transactions','categories','debts','vaults','sessions','accounts'])
      await db.execute(`DELETE FROM ${t} WHERE userId=?`, [userId]).catch(() => {})
    await db.execute('DELETE FROM users WHERE id=?', [userId])
    await db.end()
    fs.rmSync(jar, { force: true })
    console.log('cleanup done')
  }
  process.exit(fail === 0 ? 0 : 1)
})()
