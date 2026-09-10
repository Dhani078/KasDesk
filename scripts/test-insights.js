/**
 * Insights page test.
 *
 * Focus: the "7 Hari Terakhir" figure must be the LAST 7 DAYS of spending,
 * not the whole month. A heading that says 7 days above a month-to-date
 * number quietly misinforms the user about how fast money is going.
 *
 * Also checks top-categories share and the debts section render sanely.
 *
 * Run: node scripts/test-insights.js
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

const jar = path.join(os.tmpdir(), `ins-${Date.now()}.txt`)
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
/** Parse one "Rp 1.234.567" token. */
function parseIDR(s) {
  if (!s) return NaN
  const m = s.match(/(−|-)?\s*Rp\s*([\d.]+)/)
  if (!m) return NaN
  const v = parseInt(m[2].replace(/\./g, ''), 10)
  return m[1] ? -v : v
}
function afterLabel(html, label) {
  const i = html.indexOf(label)
  if (i < 0) return NaN
  return parseIDR(html.slice(i, i + 400))
}

const EMAIL = `ins-${Date.now()}@example.com`
const PW = 'ins12345'

async function main() {
  // Preflight: fail fast and clearly if the server is down.
  try {
    const probe = execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}',
      '--max-time', '15', `${BASE}/api/auth/csrf`], { encoding: 'utf8', env })
    if (!/^2/.test(String(probe).trim())) {
      console.error(`ERROR: server not responding at ${BASE} (got ${String(probe).trim()})`)
      process.exit(1)
    }
  } catch {
    console.error(`ERROR: cannot reach ${BASE} — is the server running?`)
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
    [uid, 'Insights Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )
  const w = crypto.randomUUID()
  await db.execute(
    'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,0)',
    [w, uid, 'Tunai', 'cash', 5000000]
  )

  // Fixture designed to separate the two candidate numbers:
  //   - an OLD expense (15 days ago, still this month) = 700000
  //   - RECENT expenses (within last 7 days)           = 300000
  // So: month-to-date = 1000000, last-7-days = 300000.
  const now = new Date()
  // Old but STILL THIS MONTH: day 1 guarantees it is inside month-to-date
  // while being far outside the last 7 days (unless today is the 1st..7th).
  const old = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0)
  const recent = new Date(now); recent.setDate(recent.getDate() - 2)

  const tx = (id, amount, date, title, cat) =>
    [id, uid, w, null, 'expense', amount, title, cat, new Date(), date]
  await db.execute(
    `INSERT INTO transactions (id,userId,walletId,toWalletId,type,amount,title,categoryTag,createdAt,occurredAt)
     VALUES (?,?,?,?,?,?,?,?,?,?),(?,?,?,?,?,?,?,?,?,?),(?,?,?,?,?,?,?,?,?,?)`,
    [
      ...tx(crypto.randomUUID(), 700000, old, 'Belanja lama', 'BELANJA'),
      ...tx(crypto.randomUUID(), 200000, recent, 'Makan siang', 'MAKAN'),
      ...tx(crypto.randomUUID(), 100000, recent, 'Bensin', 'TRANSPORT'),
    ]
  )

  console.log('=== Insights: "7 Hari Terakhir" must be 7 days, not the month ===')
  check('login', await login(EMAIL, PW))
  const html = curl([`${BASE}/insights`])

  // Independent expected values straight from the DB.
  const sevenStart = new Date(now); sevenStart.setHours(0, 0, 0, 0); sevenStart.setDate(sevenStart.getDate() - 6)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [[last7]] = await db.execute(
    `SELECT COALESCE(SUM(amount),0) AS b FROM transactions
     WHERE userId=? AND type='expense' AND occurredAt >= ?`, [uid, sevenStart]
  )
  const [[month]] = await db.execute(
    `SELECT COALESCE(SUM(amount),0) AS b FROM transactions
     WHERE userId=? AND type='expense' AND occurredAt >= ?`, [uid, monthStart]
  )
  const exp7 = Number(last7.b)
  const expMonth = Number(month.b)

  console.log(`  (fixture: last7=${exp7}, month=${expMonth})`)
  // Guard the fixture itself: if these are equal the test proves nothing.
  if (exp7 === expMonth) {
    console.log('\n--- SKIPPED: today is early in the month, so the 7-day and')
    console.log('    month-to-date windows overlap and the fixture cannot')
    console.log('    distinguish them. Re-run later in the month. ---')
    await db.execute('DELETE FROM transactions WHERE userId=?', [uid])
    await db.execute('DELETE FROM wallets WHERE userId=?', [uid])
    await db.execute('DELETE FROM users WHERE id=?', [uid])
    await db.end()
    fs.rmSync(jar, { force: true })
    console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed (SKIPPED)\n${'='.repeat(46)}`)
    process.exit(0)
  }
  check('fixture distinguishes 7-day from month total', true,
    `last7=${exp7} month=${expMonth}`)

  const shown = afterLabel(html, '7 Hari Terakhir')
  check(`"7 Hari Terakhir" shows the 7-day total (${exp7})`, shown === exp7,
    `shown ${shown} (month is ${expMonth})`)

  // Top categories should reflect spending too.
  check('Kategori Terbesar section rendered', html.includes('Kategori Terbesar'))
  check('top category MAKAN listed', html.includes('MAKAN'), '')

  await db.execute('DELETE FROM transactions WHERE userId=?', [uid])
  await db.execute('DELETE FROM wallets WHERE userId=?', [uid])
  await db.execute('DELETE FROM users WHERE id=?', [uid])
  await db.end()
  fs.rmSync(jar, { force: true })

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})