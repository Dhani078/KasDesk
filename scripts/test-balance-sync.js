/**
 * Test Wallet Balance Sync & Reconciliation.
 * Run: node scripts/test-balance-sync.js
 */
const fs = require('fs')
const path = require('path')

const envFile = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envFile)) {
  for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

const { db } = require('../lib/db')
const { wallets, transactions, users } = require('../lib/db/schema')
const { eq, and } = require('drizzle-orm')

let pass = 0
let fail = 0
const check = (name, cond, details = '') => {
  if (cond) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    console.log(`  FAIL  ${name} ${details ? '-> ' + details : ''}`)
  }
}

async function run() {
  console.log('=== Wallet Balance Sync & Reconciliation Tests ===')

  // Find demo user
  const [demo] = await db.select().from(users).where(eq(users.email, 'demo@kasdesk.test')).limit(1)
  if (!demo) {
    console.error('Demo user not found, please run seed-demo.js first')
    process.exit(1)
  }

  // Create isolated test wallet
  const testWalletId = crypto.randomUUID()
  await db.insert(wallets).values({
    id: testWalletId,
    userId: demo.id,
    name: 'Dompet Sync Test',
    type: 'bank',
    balance: 1_000_000,
    isArchived: 0,
  })

  try {
    // 1. Initial State
    const [w0] = await db.select().from(wallets).where(eq(wallets.id, testWalletId)).limit(1)
    check('initial wallet balance is 1M', Number(w0.balance) === 1_000_000)

    // 2. Upward Reconciliation (+500k to 1.5M)
    const target1 = 1_500_000
    const diff1 = target1 - Number(w0.balance)
    const txId1 = crypto.randomUUID()

    await db.transaction(async (tx) => {
      await tx.insert(transactions).values({
        id: txId1,
        userId: demo.id,
        walletId: testWalletId,
        type: 'income',
        amount: diff1,
        title: 'Rekonsiliasi Saldo',
        categoryTag: 'PENYESUAIAN',
        note: 'Rekonsiliasi Saldo (Scan Screenshot)',
        occurredAt: new Date(),
      })
      await tx.update(wallets).set({ balance: target1 }).where(eq(wallets.id, testWalletId))
    })

    const [w1] = await db.select().from(wallets).where(eq(wallets.id, testWalletId)).limit(1)
    const [t1] = await db.select().from(transactions).where(eq(transactions.id, txId1)).limit(1)
    check('wallet balance updated to 1.5M', Number(w1.balance) === 1_500_000)
    check('audit transaction logged as income', t1 && t1.type === 'income' && Number(t1.amount) === 500_000)
    check('audit category tagged PENYESUAIAN', t1 && t1.categoryTag === 'PENYESUAIAN')

    // 3. Downward Reconciliation (-300k to 1.2M)
    const target2 = 1_200_000
    const diff2 = Number(w1.balance) - target2
    const txId2 = crypto.randomUUID()

    await db.transaction(async (tx) => {
      await tx.insert(transactions).values({
        id: txId2,
        userId: demo.id,
        walletId: testWalletId,
        type: 'expense',
        amount: diff2,
        title: 'Rekonsiliasi Saldo',
        categoryTag: 'PENYESUAIAN',
        note: 'Rekonsiliasi Saldo (Scan Screenshot)',
        occurredAt: new Date(),
      })
      await tx.update(wallets).set({ balance: target2 }).where(eq(wallets.id, testWalletId))
    })

    const [w2] = await db.select().from(wallets).where(eq(wallets.id, testWalletId)).limit(1)
    const [t2] = await db.select().from(transactions).where(eq(transactions.id, txId2)).limit(1)
    check('wallet balance reduced to 1.2M', Number(w2.balance) === 1_200_000)
    check('audit transaction logged as expense', t2 && t2.type === 'expense' && Number(t2.amount) === 300_000)

  } finally {
    // Cleanup
    await db.delete(transactions).where(eq(transactions.walletId, testWalletId))
    await db.delete(wallets).where(eq(wallets.id, testWalletId))
  }

  console.log(`\n==============================================\nRESULT: ${pass} passed, ${fail} failed\n==============================================`)
  process.exit(fail ? 1 : 0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
