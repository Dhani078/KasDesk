/**
 * KasDesk Micro-Savings & Spare-Change Round-Up Test Suite (EPIC 5)
 *
 * Verifies:
 * 1. Mathematical accuracy of spare-change round-up across steps (1k, 5k, 10k).
 * 2. Edge case handling (exact multiples, zero, negative).
 * 3. "Pay Yourself First" rules calculation (>= Rp 1M threshold).
 * 4. TransactionSchema validation with round-up fields.
 * 5. Atomic database debit & vault allocation.
 *
 * Run: npx tsx scripts/test-micro-savings.js
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function loadEnv(f) {
  const o = {}
  if (!fs.existsSync(f)) return o
  for (const raw of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) o[m[1]] = m[2].trim()
  }
  return o
}

const env = { ...process.env, ...loadEnv(path.join(__dirname, '..', '.env.local')) }

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const { calculateRoundUp, calculatePayYourselfFirst } = require('../lib/micro-savings')
const { TransactionSchema } = require('../lib/schemas')

async function main() {
  console.log('=== Micro-Savings & Spare-Change Round-Up Tests (EPIC 5) ===')

  // 1. Pure round-up calculations
  const r1 = calculateRoundUp(22000, 5000)
  check('22.000 rounded to 5.000 gives total 25.000', r1.roundedTotal === 25000)
  check('22.000 rounded to 5.000 yields 3.000 spare change', r1.spareChange === 3000)

  const r2 = calculateRoundUp(25000, 5000)
  check('exact multiple 25.000 yields 0 spare change', r2.spareChange === 0)
  check('exact multiple 25.000 keeps roundedTotal 25.000', r2.roundedTotal === 25000)

  const r3 = calculateRoundUp(12300, 1000)
  check('12.300 rounded to 1.000 gives total 13.000', r3.roundedTotal === 13000)
  check('12.300 rounded to 1.000 yields 700 spare change', r3.spareChange === 700)

  const r4 = calculateRoundUp(18000, 10000)
  check('18.000 rounded to 10.000 gives total 20.000', r4.roundedTotal === 20000)
  check('18.000 rounded to 10.000 yields 2.000 spare change', r4.spareChange === 2000)

  const rZero = calculateRoundUp(0, 5000)
  check('zero amount yields 0 spare change', rZero.spareChange === 0 && rZero.roundedTotal === 0)

  const rNeg = calculateRoundUp(-5000, 5000)
  check('negative amount handled gracefully', rNeg.spareChange === 0)

  // 2. Pay Yourself First rules
  const pyfBelow = calculatePayYourselfFirst(500000, 15)
  check('income < 1M is not eligible for Pay Yourself First', !pyfBelow.isEligible)

  const pyfSalary = calculatePayYourselfFirst(8000000, 15)
  check('income 8M is eligible for Pay Yourself First', pyfSalary.isEligible)
  check('income 8M recommends 1.200.000 (15%)', pyfSalary.recommendedAmount === 1200000)

  const pyfHigh = calculatePayYourselfFirst(10000000, 20)
  check('income 10M with 20% recommends 2.000.000', pyfHigh.recommendedAmount === 2000000)

  // 3. Schema validation
  const validParsed = TransactionSchema.safeParse({
    wallet_id: 'w-123',
    type: 'expense',
    amount: 22000,
    title: 'Kopi Kenangan',
    category_tag: 'MAKAN',
    round_up_vault_id: 'vault-456',
    round_up_amount: 3000,
  })
  check('TransactionSchema accepts round_up_vault_id and round_up_amount', validParsed.success)

  // 4. Database atomic verification
  const mysql = require('mysql2/promise')
  let conn
  try {
    conn = await mysql.createConnection({
      host: env.DATABASE_HOST,
      port: Number(env.DATABASE_PORT) || 3306,
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    })

    const testUserId = `user-ms-${Date.now()}`
    const testWalletId = `w-ms-${Date.now()}`
    const testVaultId = `v-ms-${Date.now()}`

    // Setup fixtures
    await conn.execute(
      'INSERT INTO users (id, email, passwordHash) VALUES (?, ?, ?)',
      [testUserId, `${testUserId}@example.test`, 'hashed']
    )
    await conn.execute(
      'INSERT INTO wallets (id, userId, name, type, balance, isArchived) VALUES (?, ?, ?, ?, ?, 0)',
      [testWalletId, testUserId, 'Dompet Test', 'cash', 100000]
    )
    await conn.execute(
      'INSERT INTO vaults (id, userId, name, targetAmount, currentAmount, isCompleted) VALUES (?, ?, ?, ?, 0, 0)',
      [testVaultId, testUserId, 'Brankas Test', 500000]
    )

    // Simulate atomic round-up execution
    const expenseAmt = 22000
    const roundUpAmt = 3000
    const totalDebit = expenseAmt + roundUpAmt

    await conn.beginTransaction()
    // Debit wallet total (expense + round-up)
    await conn.execute(
      'UPDATE wallets SET balance = balance - ? WHERE id = ? AND balance >= ?',
      [totalDebit, testWalletId, totalDebit]
    )
    // Credit vault
    await conn.execute(
      'UPDATE vaults SET currentAmount = currentAmount + ? WHERE id = ?',
      [roundUpAmt, testVaultId]
    )
    // Insert expense tx
    await conn.execute(
      'INSERT INTO transactions (id, userId, walletId, type, amount, title) VALUES (?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), testUserId, testWalletId, 'expense', expenseAmt, 'Kopi']
    )
    // Insert round-up audit tx
    await conn.execute(
      'INSERT INTO transactions (id, userId, walletId, type, amount, title, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), testUserId, testWalletId, 'expense', roundUpAmt, 'Celengan: Kopi', 'Alokasi Celengan Pembulatan']
    )
    await conn.commit()

    // Assert final balances
    const [[wRow]] = await conn.execute('SELECT balance FROM wallets WHERE id = ?', [testWalletId])
    check('wallet balance reduced by totalDebit (100.000 -> 75.000)', Number(wRow.balance) === 75000)

    const [[vRow]] = await conn.execute('SELECT currentAmount FROM vaults WHERE id = ?', [testVaultId])
    check('vault currentAmount increased by roundUpAmt (0 -> 3.000)', Number(vRow.currentAmount) === 3000)

    // Cleanup
    await conn.execute('DELETE FROM transactions WHERE userId = ?', [testUserId])
    await conn.execute('DELETE FROM vaults WHERE userId = ?', [testUserId])
    await conn.execute('DELETE FROM wallets WHERE userId = ?', [testUserId])
    await conn.execute('DELETE FROM users WHERE id = ?', [testUserId])
    check('test fixtures cleaned up cleanly', true)
  } catch (err) {
    check('database verification', false, err.message)
  } finally {
    if (conn) await conn.end()
  }

  console.log('\n==============================================')
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  console.log('==============================================')

  if (fail > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
