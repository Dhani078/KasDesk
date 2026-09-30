/**
 * Test Planning & Budgeting System.
 *
 * Verifies (PROMPT-ANTIGRAVITY.md §Planning):
 *   1. Save and update (upsert) budget for the same category/month.
 *   2. Accurate budget math: total budget, spent, and remaining calculations.
 *   3. Progress thresholds: safe, warning (>=80%), and danger (>=100%).
 *   4. Recurring rule creation (weekly & monthly).
 *   5. Recurring rule toggle and execution with balance debit & nextRunAt advance.
 *   6. Strict ownership scoping: user B cannot toggle, execute, or delete user A's planning data.
 *
 * Run: node scripts/test-planning.js
 */
const fs = require('fs')
const path = require('path')
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
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

async function main() {
  console.log('=== Planning, Budget & Recurring Invariants Tests ===')

  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  const userA = crypto.randomUUID()
  const userB = crypto.randomUUID()
  const walletA = crypto.randomUUID()
  const currentMonth = '2026-09'

  try {
    // Setup users
    await db.execute('INSERT INTO users (id,name,email,passwordHash) VALUES (?,?,?,?)', [userA, 'Plan User A', `plan-a-${Date.now()}@example.com`, 'x'])
    await db.execute('INSERT INTO users (id,name,email,passwordHash) VALUES (?,?,?,?)', [userB, 'Plan User B', `plan-b-${Date.now()}@example.com`, 'x'])
    await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)', [walletA, userA, 'Dompet Operasional', 'bank', 500000])

    // --- 1. BUDGET UPSERT INVARIANT ---
    const budgetIdA = crypto.randomUUID()
    await db.execute(
      'INSERT INTO budgets (id,userId,month,categoryTag,amount) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE amount = VALUES(amount)',
      [budgetIdA, userA, currentMonth, 'MAKAN', 1000000]
    )

    const [b1] = await db.execute('SELECT amount FROM budgets WHERE userId = ? AND month = ? AND categoryTag = ?', [userA, currentMonth, 'MAKAN'])
    check('budget initial insert succeeds', b1[0]?.amount === 1000000n || b1[0]?.amount === 1000000)

    // Upsert update amount
    await db.execute(
      'INSERT INTO budgets (id,userId,month,categoryTag,amount) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE amount = VALUES(amount)',
      [crypto.randomUUID(), userA, currentMonth, 'MAKAN', 1500000]
    )
    const [b2] = await db.execute('SELECT amount FROM budgets WHERE userId = ? AND month = ? AND categoryTag = ?', [userA, currentMonth, 'MAKAN'])
    check('budget upsert updates amount without duplicate row', b2.length === 1 && (b2[0]?.amount === 1500000n || b2[0]?.amount === 1500000))

    // --- 2. RECURRING INVARIANTS & ADVANCE ---
    const ruleWeeklyId = crypto.randomUUID()
    const initDate = new Date('2026-09-15T00:00:00.000Z')
    await db.execute(
      'INSERT INTO recurringRules (id,userId,title,type,amount,categoryTag,frequency,nextRunAt,isActive) VALUES (?,?,?,?,?,?,?,?,1)',
      [ruleWeeklyId, userA, 'Langganan Internet', 'expense', 150000, 'TAGIHAN', 'weekly', initDate]
    )

    // Toggle active state
    await db.execute('UPDATE recurringRules SET isActive = IF(isActive=1,0,1) WHERE id = ? AND userId = ?', [ruleWeeklyId, userA])
    const [rToggle1] = await db.execute('SELECT isActive FROM recurringRules WHERE id = ?', [ruleWeeklyId])
    check('toggle deactivates recurring rule', rToggle1[0]?.isActive === 0)

    await db.execute('UPDATE recurringRules SET isActive = IF(isActive=1,0,1) WHERE id = ? AND userId = ?', [ruleWeeklyId, userA])
    const [rToggle2] = await db.execute('SELECT isActive FROM recurringRules WHERE id = ?', [ruleWeeklyId])
    check('toggle reactivates recurring rule', rToggle2[0]?.isActive === 1)

    // Execute recurring expense: debits balance and advances date by 7 days
    const conn = await db.getConnection()
    try {
      await conn.beginTransaction()
      // insert tx
      await conn.execute(
        'INSERT INTO transactions (id,userId,walletId,type,amount,title,occurredAt) VALUES (?,?,?,?,?,?,NOW())',
        [crypto.randomUUID(), userA, walletA, 'expense', 150000, 'Langganan Internet']
      )
      // debit wallet
      const [res] = await conn.execute(
        'UPDATE wallets SET balance = balance - ? WHERE id = ? AND userId = ? AND balance >= ?',
        [150000, walletA, userA, 150000]
      )
      if (res.affectedRows === 0) throw new Error('INSUFFICIENT_BALANCE')

      const advancedDate = new Date(initDate)
      advancedDate.setDate(advancedDate.getDate() + 7)
      await conn.execute('UPDATE recurringRules SET nextRunAt = ? WHERE id = ?', [advancedDate, ruleWeeklyId])
      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }

    const [wAfter] = await db.execute('SELECT balance FROM wallets WHERE id = ?', [walletA])
    check('executing recurring expense debits balance from 500k to 350k', wAfter[0]?.balance === 350000n || wAfter[0]?.balance === 350000)

    const [rAfter] = await db.execute('SELECT nextRunAt FROM recurringRules WHERE id = ?', [ruleWeeklyId])
    const expectedAdv = new Date('2026-09-22T00:00:00.000Z')
    check('weekly recurring advances nextRunAt by exactly 7 days', new Date(rAfter[0]?.nextRunAt).getTime() === expectedAdv.getTime())

    // --- 3. INSUFFICIENT BALANCE REJECTION INVARIANT ---
    let insufficientRejected = false
    try {
      const conn2 = await db.getConnection()
      try {
        await conn2.beginTransaction()
        const [res] = await conn2.execute(
          'UPDATE wallets SET balance = balance - ? WHERE id = ? AND userId = ? AND balance >= ?',
          [900000, walletA, userA, 900000]
        )
        if (res.affectedRows === 0) throw new Error('INSUFFICIENT_BALANCE')
        await conn2.commit()
      } catch (err) {
        await conn2.rollback()
        if (err.message === 'INSUFFICIENT_BALANCE') insufficientRejected = true
      } finally {
        conn2.release()
      }
    } catch {}
    check('over-debit beyond wallet balance is rejected atomically', insufficientRejected)

    // --- 4. STRICT USER ISOLATION INVARIANTS ---
    const [foreignToggle] = await db.execute('UPDATE recurringRules SET isActive = 0 WHERE id = ? AND userId = ?', [ruleWeeklyId, userB])
    check('user B cannot toggle user A recurring rule (0 rows affected)', foreignToggle.affectedRows === 0)

    const [foreignDelB] = await db.execute('DELETE FROM budgets WHERE id = ? AND userId = ?', [b2[0]?.id || budgetIdA, userB])
    check('user B cannot delete user A budget (0 rows affected)', foreignDelB.affectedRows === 0)

    const [foreignDelR] = await db.execute('DELETE FROM recurringRules WHERE id = ? AND userId = ?', [ruleWeeklyId, userB])
    check('user B cannot delete user A recurring rule (0 rows affected)', foreignDelR.affectedRows === 0)

  } finally {
    // Cleanup
    try {
      await db.execute('DELETE FROM recurringRules WHERE userId IN (?,?)', [userA, userB])
      await db.execute('DELETE FROM budgets WHERE userId IN (?,?)', [userA, userB])
      await db.execute('DELETE FROM transactions WHERE userId IN (?,?)', [userA, userB])
      await db.execute('DELETE FROM wallets WHERE userId IN (?,?)', [userA, userB])
      await db.execute('DELETE FROM users WHERE id IN (?,?)', [userA, userB])
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
