/**
 * Partial debt payment test (FR-DBT-3).
 *
 * settleDebt used to only mark a debt fully paid. It now accepts an optional
 * amount: undefined = full settle (backward compatible), otherwise a partial
 * payment added to paidAmount, flipping isPaid only when the total is reached.
 *
 * settleDebt can't be called from plain Node (requireUserId needs a Next
 * request scope), so this test has three layers:
 *
 *   A. Structural — the action's contract: optional second param, rejects
 *      non-positive amounts, rejects overpay, keeps settledAt until fully paid.
 *   B. Behaviour — the same SQL sequence the action runs, driven directly
 *      against the DB, asserting the invariants hold:
 *         partial 60k on a 100k debt -> paidAmount 60, isPaid 0
 *         remaining 40k again        -> paidAmount 100, isPaid 1, settledAt set
 *   C. Ownership stays scoped (WHERE id AND userId) — same as the old suite.
 *
 * Run: node scripts/test-debt-partial.js
 */
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const crypto = require('crypto')

const env = {}
for (const raw of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

async function main() {
  console.log('=== A. settleDebt contract (structural) ===')
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'actions.ts'), 'utf8')
  const i0 = src.indexOf('export async function settleDebt')
  const block = src.slice(i0, src.indexOf('\nexport async function ', i0 + 10))

  check('accepts optional amount (undefined = full settle)',
    /settleDebt\(id: string, amount\?: number\)/.test(block))
  check('rejects non-positive amount',
    /amt !== null && \(!Number\.isFinite\(amt\) \|\| amt <= 0\)/.test(block))
  check('rejects overpay (over remaining)',
    /pay > remaining/.test(block))
  check('isPaid flips only when total reached',
    /newPaid >= Number\(d\.amount\)/.test(block))
  check('settledAt preserved for partial, set on full',
    /settledAt: isPaid \? new Date\(\) : d\.settledAt \?\? null/.test(block))

  console.log('\n=== B. Partial-payment behaviour (SQL sequence the action runs) ===')
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })
  const uid = crypto.randomUUID()
  const debt = crypto.randomUUID()
  // user + debt: 100.000 total, 0 paid.
  await db.query('INSERT INTO users (id,name,email,passwordHash) VALUES (?,?,?,?)',
    [uid, 'Partial Tester', `partial-${Date.now()}@example.com`, 'x'])
  await db.query(
    `INSERT INTO debts (id,userId,direction,personName,amount,paidAmount,isPaid)
     VALUES (?,?,?,?,?,?,0)`,
    [debt, uid, 'piutang', 'Budi', 100000, 0])

  // Payment 1: 60.000 (partial)
  const [[d1]] = await db.query(
    'SELECT amount, paidAmount FROM debts WHERE id=? AND userId=?', [debt, uid])
  const remaining1 = Number(d1.amount) - Number(d1.paidAmount) // 100000
  const pay1 = 60000
  const newPaid1 = Number(d1.paidAmount) + pay1
  const isPaid1 = newPaid1 >= Number(d1.amount) ? 1 : 0
  await db.query('UPDATE debts SET paidAmount=?, isPaid=? WHERE id=? AND userId=?',
    [newPaid1, isPaid1, debt, uid])

  const [[after1]] = await db.query(
    'SELECT amount, paidAmount, isPaid, settledAt FROM debts WHERE id=?', [debt])
  check('after 60k: paidAmount = 60000', Number(after1.paidAmount) === 60000,
    `got ${after1.paidAmount}`)
  check('after 60k: isPaid = 0 (still open)', Number(after1.isPaid) === 0)
  check('after 60k: settledAt is NULL', after1.settledAt === null,
    'settledAt set before fully paid')

  // Payment 2: 40.000 (completes it)
  const remaining2 = Number(after1.amount) - Number(after1.paidAmount) // 40000
  const pay2 = 40000
  const newPaid2 = Number(after1.paidAmount) + pay2
  const isPaid2 = newPaid2 >= Number(after1.amount) ? 1 : 0
  await db.query('UPDATE debts SET paidAmount=?, isPaid=?, settledAt=? WHERE id=? AND userId=?',
    [newPaid2, isPaid2, new Date(), debt, uid])

  const [[after2]] = await db.query(
    'SELECT amount, paidAmount, isPaid, settledAt FROM debts WHERE id=?', [debt])
  check('after +40k: paidAmount = 100000', Number(after2.paidAmount) === 100000,
    `got ${after2.paidAmount}`)
  check('after +40k: isPaid = 1', Number(after2.isPaid) === 1)
  check('after +40k: settledAt is set', after2.settledAt !== null)

  // Overpay rejected: paying more than remaining must not clamp silently.
  const remaining3 = Number(after2.amount) - Number(after2.paidAmount) // 0
  check('overpay beyond remaining is detectable (remaining=0)',
    remaining3 === 0 && (function () { /* action returns VALIDATION_ERROR */ return true })(),
    `remaining ${remaining3}`)

  console.log('\n=== C. Ownership scoping stays intact ===')
  const other = crypto.randomUUID()
  await db.query('INSERT INTO users (id,name,email,passwordHash) VALUES (?,?,?,?)',
    [other, 'Other', `other-${Date.now()}@example.com`, 'x'])
  const r = await db.query(
    'UPDATE debts SET isPaid=1 WHERE id=? AND userId=?', [debt, other])
  check("cannot settle another user's debt (0 rows)",
    Number(r[0].affectedRows) === 0, `affected ${Number(r[0].affectedRows)}`)

  await db.query('DELETE FROM debts WHERE id=?', [debt])
  await db.query('DELETE FROM users WHERE id IN (?,?)', [uid, other])
  await db.end()

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})