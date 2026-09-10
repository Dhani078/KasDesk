/**
 * Proves (or disproves) the read-modify-write hazard in balance updates.
 *
 * If the code does `SELECT balance` then `UPDATE balance = <read> - amount`,
 * two concurrent expenses can both read the SAME starting balance and the
 * second write silently overwrites the first (a lost update). In a finance
 * app that means money appears from nowhere.
 *
 * The fix is an atomic SQL expression: `UPDATE ... SET balance = balance - ?`.
 *
 * Run:  node scripts/test-concurrency.js
 */
const fs = require('fs'), path = require('path')
const mysql = require('mysql2/promise')
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

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '→ ' + d : ''}`) }
}

const N = 10          // concurrent expenses
const EACH = 1000     // each withdraws 1.000

;(async () => {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionLimit: 10,
  })
  const userId = crypto.randomUUID(), wId = crypto.randomUUID()
  const START = N * EACH   // exactly enough to cover all N

  try {
    await db.execute('INSERT INTO users (id,email,name,passwordHash) VALUES (?,?,?,?)',
      [userId, `conc-${Date.now()}@example.com`, 'Concurrency', 'x'])
    await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
      [wId, userId, 'C', 'cash', START])

    const bal = async () => {
      const [r] = await db.execute('SELECT balance FROM wallets WHERE id=?', [wId])
      return Number(r[0].balance)
    }

    // ---- A. UNSAFE pattern: SELECT then UPDATE with the value read
    console.log('\n=== A. read-modify-write (current pattern) ===')
    await db.execute('UPDATE wallets SET balance=? WHERE id=?', [START, wId])
    await Promise.all(Array.from({ length: N }, async () => {
      const c = await db.getConnection()
      try {
        await c.beginTransaction()
        const [rows] = await c.execute('SELECT balance FROM wallets WHERE id=?', [wId])
        const cur = Number(rows[0].balance)
        await new Promise((r) => setTimeout(r, 5))      // widen the window
        await c.execute('UPDATE wallets SET balance=? WHERE id=?', [cur - EACH, wId])
        await c.commit()
      } finally { c.release() }
    }))
    const unsafe = await bal()
    console.log(`  expected ${START - N * EACH}, got ${unsafe}`)

    // ---- B. SAFE pattern: atomic SQL expression
    console.log('\n=== B. atomic UPDATE balance = balance - ? ===')
    await db.execute('UPDATE wallets SET balance=? WHERE id=?', [START, wId])
    await Promise.all(Array.from({ length: N }, async () => {
      const c = await db.getConnection()
      try {
        await c.beginTransaction()
        await c.execute('UPDATE wallets SET balance = balance - ? WHERE id=?', [EACH, wId])
        await c.commit()
      } finally { c.release() }
    }))
    const safe = await bal()
    console.log(`  expected ${START - N * EACH}, got ${safe}`)

    console.log('\n=== VERDICT ===')
    check('atomic pattern is exact', safe === START - N * EACH, `got ${safe}`)
    check('read-modify-write LOSES updates (hazard is real)', unsafe !== START - N * EACH,
      `unsafe also exact (${unsafe}) — no hazard on this DB`)

    console.log(`\n${'='.repeat(48)}`)
    console.log(`RESULT: ${pass} passed, ${fail} failed`)
    console.log('='.repeat(48))
  } catch (e) {
    console.error('ERROR:', e.message); fail++
  } finally {
    for (const t of ['wallets','transactions','categories','debts','vaults'])
      await db.execute(`DELETE FROM ${t} WHERE userId=?`, [userId]).catch(() => {})
    await db.execute('DELETE FROM users WHERE id=?', [userId])
    await db.end()
    console.log('cleanup done')
  }
  process.exit(fail === 0 ? 0 : 1)
})()
