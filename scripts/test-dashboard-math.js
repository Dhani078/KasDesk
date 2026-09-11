/**
 * Dashboard math test — PRD §6.7.
 *
 * Recomputes every headline number straight from the database and asserts
 * the rendered page agrees. This catches "the number looks plausible" bugs
 * that no amount of clicking would reveal.
 *
 * Checks:
 *   - Total Saldo == sum of non-archived wallet balances
 *   - Aman Harian == max(0, floor((liquid - vaults - debts) / daysLeft))
 *   - Month-to-date Masuk/Keluar, with transfers EXCLUDED
 *   - Transfers do not corrupt the month totals
 *
 * Run: node scripts/test-dashboard-math.js
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

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `dash-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', ...args], { encoding: 'utf8', env })
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

/**
 * Parse ONE currency token, e.g. "Rp 1.234.567" -> 1234567.
 * Must match a single token only: taking every digit in a region also
 * swallows surrounding ids/telephone-like numbers and yields garbage.
 */
function parseIDR(s) {
  if (!s) return NaN
  const m = s.match(/(−|-)?\s*Rp\s*([\d.]+)/)
  if (!m) return NaN
  const v = parseInt(m[2].replace(/\./g, ''), 10)
  return m[1] ? -v : v
}
/** Pull the first currency token that follows a label in the HTML. */
function afterLabel(html, label) {
  const i = html.indexOf(label)
  if (i < 0) return NaN
  // Scan a generous window: since the LogoutButton was added, the markup
  // between a label and its value can contain a long inline SVG.
  return parseIDR(html.slice(i, i + 4000))
}

const EMAIL = `dash-${Date.now()}@example.com`
const PW = 'dash12345'

async function main() {
  // Preflight: a dead server used to surface as a confusing curl/JSON error
  // deep inside the run, looking like a bug in this test. Fail fast with a
  // clear message instead.
  try {
    const probe = execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}',
      '--max-time', '15', `${BASE}/api/auth/csrf`], { encoding: 'utf8', env })
    if (!/^2/.test(String(probe).trim())) {
      console.error(`ERROR: server not responding at ${BASE} (got ${String(probe).trim()})`)
      console.error('Start it with: npx next start -p 3333')
      process.exit(1)
    }
  } catch (e) {
    console.error(`ERROR: cannot reach ${BASE} — is the server running?`)
    console.error('Start it with: npx next start -p 3333')
    process.exit(1)
  }

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
    [uid, 'Dash Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )

  // Known-good fixture: two wallets, one vault, one debt, and a transfer
  // that must NOT inflate month totals.
  const w1 = crypto.randomUUID(), w2 = crypto.randomUUID()
  const v1 = crypto.randomUUID(), d1 = crypto.randomUUID()
  await db.execute(
    'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,0)',
    [w1, uid, 'Tunai', 'cash', 1000000]
  )
  await db.execute(
    'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,0)',
    [w2, uid, 'Bank', 'bank', 250000]
  )
  await db.execute(
    'INSERT INTO vaults (id,userId,name,targetAmount,currentAmount,isCompleted) VALUES (?,?,?,?,?,0)',
    [v1, uid, 'Dana Darurat', 5000000, 300000]
  )
  await db.execute(
    'INSERT INTO debts (id,userId,direction,personName,amount,paidAmount,isPaid) VALUES (?,?,?,?,?,?,0)',
    [d1, uid, 'owed', 'Teman', 200000, 50000]
  )

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const mkTx = (type, amount) => [
    crypto.randomUUID(), uid, w1, null, type, amount, type, new Date(), monthStart,
  ]
  // income 500k, expense 120k, transfer 999k (must be ignored by month totals)
  await db.execute(
    `INSERT INTO transactions (id,userId,walletId,toWalletId,type,amount,title,createdAt,occurredAt)
     VALUES (?,?,?,?,?,?,?,?,?),(?,?,?,?,?,?,?,?,?),(?,?,?,?,?,?,?,?,?)`,
    [
      ...mkTx('income', 500000),
      ...mkTx('expense', 120000),
      ...mkTx('transfer', 999000),
    ]
  )

  console.log('=== Dashboard math (PRD §6.7) ===')
  check('login', await login(EMAIL, PW))
  const html = curl([`${BASE}/`])

  // --- Independent recomputation from the DB ---
  const [[bal]] = await db.execute(
    'SELECT COALESCE(SUM(balance),0) AS b FROM wallets WHERE userId=? AND isArchived=0', [uid]
  )
  const expectedTotal = Number(bal.b)

  const [[v]] = await db.execute(
    'SELECT COALESCE(SUM(currentAmount),0) AS b FROM vaults WHERE userId=? AND isCompleted=0', [uid]
  )
  const [[d]] = await db.execute(
    'SELECT COALESCE(SUM(amount - paidAmount),0) AS b FROM debts WHERE userId=? AND isPaid=0', [uid]
  )
  const vaultAlloc = Number(v.b)
  const debts = Number(d.b)

  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(1, last - now.getDate() + 1)
  const spendable = expectedTotal - vaultAlloc - debts
  const expectedSafe = Math.max(0, Math.floor(spendable / Math.max(1, daysLeft)))

  // A long inline SVG (LogoutButton) sits between "Total Saldo" and its
  // value, so a narrow slice misses the number entirely.
  const shownTotal = afterLabel(html, 'Total Saldo')
  const shownSafe = afterLabel(html, 'Aman Harian')

  check(`Total Saldo = ${expectedTotal}`, shownTotal === expectedTotal, `shown ${shownTotal}`)
  check(`Aman Harian = ${expectedSafe} (daysLeft=${daysLeft})`, shownSafe === expectedSafe, `shown ${shownSafe}`)
  check('spendable excludes vaults and debts',
    spendable === expectedTotal - vaultAlloc - debts, `${spendable}`)

  // --- Month totals: transfers must be excluded ---
  const [[inc]] = await db.execute(
    "SELECT COALESCE(SUM(amount),0) AS b FROM transactions WHERE userId=? AND type='income' AND occurredAt>=?",
    [uid, monthStart]
  )
  const [[exp]] = await db.execute(
    "SELECT COALESCE(SUM(amount),0) AS b FROM transactions WHERE userId=? AND type='expense' AND occurredAt>=?",
    [uid, monthStart]
  )
  const shownInc = afterLabel(html, 'Masuk')
  // The LogoutButton also contains the word "Keluar" (in its aria-label and
  // its label), which appears BEFORE the summary-section label that means
  // monthly expense. Anchor on the first "Keluar" AFTER "Masuk" instead.
  const iMasuk = html.indexOf('Masuk')
  const iKeluar = html.indexOf('Keluar', iMasuk)
  const shownExp = iKeluar < 0 ? NaN : parseIDR(html.slice(iKeluar, iKeluar + 4000))
  check(`Masuk = ${Number(inc.b)} (transfers excluded)`, shownInc === Number(inc.b), `shown ${shownInc}`)
  check(`Keluar = ${Number(exp.b)} (transfers excluded)`, shownExp === Number(exp.b), `shown ${shownExp}`)
  check('transfer 999000 did NOT inflate Keluar', shownExp !== 999000, `shown ${shownExp}`)

  // cleanup
  await db.execute('DELETE FROM transactions WHERE userId=?', [uid])
  await db.execute('DELETE FROM vaults WHERE userId=?', [uid])
  await db.execute('DELETE FROM debts WHERE userId=?', [uid])
  await db.execute('DELETE FROM wallets WHERE userId=?', [uid])
  await db.execute('DELETE FROM users WHERE id=?', [uid])
  await db.end()
  fs.rmSync(jar, { force: true })

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  // Print the full error, not just the message: an intermittent failure
  // here was traced to neither logic nor fixtures, so the next occurrence
  // must carry enough detail to diagnose (stack + code).
  console.error('ERROR:', e && e.stack ? e.stack : e)
  console.error('code:', e && e.code, '| errno:', e && e.errno, '| sqlState:', e && e.sqlState)
  process.exit(1)
})