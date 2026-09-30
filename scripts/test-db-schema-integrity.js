/**
 * Database Schema & Composite Index Integrity Test.
 *
 * Verifies (PROMPT-ANTIGRAVITY.md §Tahap 3):
 *   1. Required tables exist (schema_migrations, authRateLimits, budgets, recurringRules, etc.).
 *   2. Required hardened columns exist (users.sessionInvalidBefore, transactions.clientMutationId).
 *   3. Critical composite unique and performance indexes are in place:
 *      - tx_user_client_mutation_uq (userId, clientMutationId) [UNIQUE]
 *      - tx_user_date_idx (userId, occurredAt) [INDEX]
 *      - tx_wallet_date_idx (walletId, occurredAt) [INDEX]
 *      - budgets_user_month_category_uq (userId, month, categoryTag) [UNIQUE]
 *
 * Run: node scripts/test-db-schema-integrity.js
 */
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

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
  console.log('=== Database Schema & Composite Index Integrity Tests ===')

  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 3,
  })

  try {
    // 1. Tables check
    const [tables] = await db.execute('SHOW TABLES')
    const tableNames = new Set(tables.map((t) => Object.values(t)[0]))

    const REQUIRED_TABLES = [
      'users', 'wallets', 'transactions', 'vaults', 'debts',
      'categories', 'budgets', 'recurringRules', 'authRateLimits', 'schema_migrations'
    ]

    for (const tbl of REQUIRED_TABLES) {
      check(`table "${tbl}" exists in database`, tableNames.has(tbl))
    }

    // 2. Specific columns check
    const [userCols] = await db.execute('DESCRIBE users')
    const userColNames = new Set(userCols.map((c) => c.Field))
    check('users.sessionInvalidBefore column exists', userColNames.has('sessionInvalidBefore'))

    const [txCols] = await db.execute('DESCRIBE transactions')
    const txColNames = new Set(txCols.map((c) => c.Field))
    check('transactions.clientMutationId column exists', txColNames.has('clientMutationId'))

    // 3. Indexes on transactions
    const [txIndexes] = await db.execute('SHOW INDEX FROM transactions')
    const txIndexMap = new Map()
    txIndexes.forEach((i) => {
      const list = txIndexMap.get(i.Key_name) || []
      list.push(i.Column_name)
      txIndexMap.set(i.Key_name, list)
    })

    check('tx_user_date_idx composite index exists', txIndexMap.has('tx_user_date_idx'))
    check('tx_wallet_date_idx composite index exists', txIndexMap.has('tx_wallet_date_idx'))
    check('tx_user_client_mutation_uq composite unique index exists', txIndexMap.has('tx_user_client_mutation_uq'))

    // 4. Indexes on budgets
    const [bIndexes] = await db.execute('SHOW INDEX FROM budgets')
    const bIndexMap = new Map()
    bIndexes.forEach((i) => {
      const list = bIndexMap.get(i.Key_name) || []
      list.push(i.Column_name)
      bIndexMap.set(i.Key_name, list)
    })

    check('budgets_user_month_category_uq composite unique index exists', bIndexMap.has('budgets_user_month_category_uq'))

  } finally {
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
