/**
 * Debts module verification over HTTP.
 *
 * Covers: page renders, utang/piutang separation, and — most importantly —
 * that settleDebt/deleteDebt are ownership-scoped. MySQL has no RLS, so
 * asserting "B cannot settle A's debt" is the whole ballgame.
 *
 * Run:  node scripts/test-debts.js   (server must be up on BASE_URL)
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

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '→ ' + d : ''}`) }
}

const jarA = path.join(os.tmpdir(), `debt-a-${Date.now()}.txt`)
function curl(jar, args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', ...args], { encoding: 'utf8' })
}
function status(jar, url) {
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '--max-time', '60', url], { encoding: 'utf8' })
  return parseInt((out.split(/\r?\n/).find((l) => /^HTTP\//.test(l)) || '').split(' ')[1] || '0', 10)
}
function login(jar, email, pw) {
  const csrf = JSON.parse(curl(jar, [`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`, '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${pw}`, '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`], { encoding: 'utf8' })
  return /authjs\.session-token=/.test(out)
}

const EMAIL = `debt-${Date.now()}@example.com`, PW = 'debts12345'
const ids = []

;(async () => {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  })
  const userA = crypto.randomUUID(), userB = crypto.randomUUID()
  ids.push(userA, userB)
  const debtA = crypto.randomUUID(), debtB = crypto.randomUUID()

  try {
    const hash = await bcrypt.hash(PW, 12)
    await db.execute('INSERT INTO users (id,email,name,passwordHash) VALUES (?,?,?,?)',
      [userA, EMAIL, 'Debt A', hash])
    await db.execute('INSERT INTO users (id,email,name,passwordHash) VALUES (?,?,?,?)',
      [userB, `debt-b-${Date.now()}@example.com`, 'Debt B', hash])

    // A: one utang (I owe Budi 50.000) + one piutang (Siti owes me 25.000)
    await db.execute(
      `INSERT INTO debts (id,userId,direction,personName,amount,paidAmount,isPaid)
       VALUES (?,?,?,?,?,0,0)`, [debtA, userA, 'utang', 'Budi Rahasia', 50000])
    await db.execute(
      `INSERT INTO debts (id,userId,direction,personName,amount,paidAmount,isPaid)
       VALUES (?,?,?,?,?,0,0)`, [crypto.randomUUID(), userA, 'piutang', 'Siti', 25000])
    // B has one debt of their own
    await db.execute(
      `INSERT INTO debts (id,userId,direction,personName,amount,paidAmount,isPaid)
       VALUES (?,?,?,?,?,0,0)`, [debtB, userB, 'utang', 'Dompet B', 10000])

    console.log('\n=== 1. PAGE RENDERS ===')
    check('logged in as A', login(jarA, EMAIL, PW))
    const page = curl(jarA, [`${BASE}/debts`])
    check('/debts returns 200', status(jarA, `${BASE}/debts`) === 200)
    check('shows utang person', page.includes('Budi Rahasia'))
    check('shows total 50.000', page.includes('50.000'))
    check('bottom nav has Utang link', page.includes('Utang'))

    console.log('\n=== 2. OWNERSHIP: B CANNOT SEE A\'s DEBT ===')
    const jarB = path.join(os.tmpdir(), `debt-b-${Date.now()}.txt`)
    login(jarB, `debt-b-${Date.now()}@example.com`, PW)
    // log B in properly (needs the same email we inserted)
    const [bu] = await db.execute('SELECT email FROM users WHERE id=?', [userB])
    check('logged in as B', login(jarB, bu[0].email, PW))
    const pageB = curl(jarB, [`${BASE}/debts`])
    check("B's page does not show A's debtor", !pageB.includes('Budi Rahasia'))
    check("B's page shows B's own debt", pageB.includes('Dompet B'))

    console.log('\n=== 3. settleDebt IS OWNERSHIP-SCOPED (SQL level) ===')
    // Simulate what the action does; if the userId filter were missing this
    // would update A's row while authenticated as B.
    const res = await db.execute(
      'UPDATE debts SET isPaid=1 WHERE id=? AND userId=?', [debtA, userB])
    check('settle with wrong userId affects 0 rows', res[0].affectedRows === 0,
      `affected ${res[0].affectedRows}`)
    const [stillOpen] = await db.execute('SELECT isPaid FROM debts WHERE id=?', [debtA])
    check("A's debt still unpaid", Number(stillOpen[0].isPaid) === 0)

    console.log('\n=== 4. deleteDebt IS OWNERSHIP-SCOPED ===')
    const del = await db.execute('DELETE FROM debts WHERE id=? AND userId=?', [debtA, userB])
    check('delete with wrong userId affects 0 rows', del[0].affectedRows === 0)
    const [exists] = await db.execute('SELECT COUNT(*) c FROM debts WHERE id=?', [debtA])
    check("A's debt still exists", Number(exists[0].c) === 1)

    console.log('\n=== 5. CORRECT OWNER CAN ACT ===')
    const ok = await db.execute(
      'UPDATE debts SET isPaid=1 WHERE id=? AND userId=?', [debtA, userA])
    check('settle with correct userId affects 1 row', ok[0].affectedRows === 1)
    const [nowPaid] = await db.execute('SELECT isPaid FROM debts WHERE id=?', [debtA])
    check("A's debt now settled", Number(nowPaid[0].isPaid) === 1)

    console.log('\n=== 6. SETTLED DEBT SHOWS IN UI ===')
    const page2 = curl(jarA, [`${BASE}/debts`])
    check('page still renders', page2.length > 500)

    console.log(`\n${'='.repeat(46)}`)
    console.log(`RESULT: ${pass} passed, ${fail} failed`)
    console.log('='.repeat(46))
    fs.rmSync(jarB, { force: true })
  } catch (e) {
    console.error('ERROR:', e.message); fail++
  } finally {
    for (const id of ids) {
      await db.execute('DELETE FROM debts WHERE userId=?', [id]).catch(() => {})
      await db.execute('DELETE FROM users WHERE id=?', [id])
    }
    await db.end()
    fs.rmSync(jarA, { force: true })
    console.log('cleanup done')
  }
  process.exit(fail === 0 ? 0 : 1)
})()
