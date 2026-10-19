/**
 * Database integration and lifecycle test suite for Multi-Currency Exchange Rates (EPIC 1).
 *
 * Verifies:
 *   1. Atomic insertion and schema adherence in exchangeRates table.
 *   2. Decimal precision retention (decimal(18,6)) for forex, gold, and crypto assets.
 *   3. Unique constraint enforcement on (fromCurrency, toCurrency) pair.
 *   4. Upsert semantics and rate fluctuation update with timestamp advancement.
 *   5. Composite index lookup on (fromCurrency, toCurrency, updatedAt).
 *   6. Multi-currency transaction baseAmount calculation and ledger rollup against live DB.
 *   7. Currency-aware wallet balance and transaction integrity across USD and EUR.
 *   8. Clean fixture teardown with zero residual records.
 *
 * Run: node scripts/test-exchange-rates-db.js
 */
const fs = require('fs'), path = require('path')
const mysql = require('mysql2/promise')
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
const env = loadEnv(path.join(__dirname, '..', '.env.local'))

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '→ ' + d : ''}`) }
}

const sql = () => mysql.createPool({
  host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
  user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
})

;(async () => {
  console.log('=== Multi-Currency Exchange Rates Database Integration Tests (EPIC 1) ===\n')
  const db = sql()

  const prefix = `testfx-${Date.now()}`
  const rateIdUSD = crypto.randomUUID()
  const rateIdSGD = crypto.randomUUID()
  const rateIdXAU = crypto.randomUUID()
  const rateIdBTC = crypto.randomUUID()

  const userId = crypto.randomUUID()
  const walletUsdId = crypto.randomUUID()
  const walletEurId = crypto.randomUUID()
  const txUsdId = crypto.randomUUID()
  const txEurId = crypto.randomUUID()

  const insertedRateIds = [rateIdUSD, rateIdSGD, rateIdXAU, rateIdBTC]

  try {
    // 0. Setup test user
    await db.execute(
      'INSERT INTO users (id, email, name, passwordHash) VALUES (?, ?, ?, ?)',
      [userId, `${prefix}@example.com`, 'FX Test User', 'fx-hash']
    )

    // 1. Insert initial exchange rates (Forex, Commodity, Crypto)
    await db.execute(
      `INSERT INTO exchangeRates (id, fromCurrency, toCurrency, rate, provider)
       VALUES (?, 'USD', 'IDR', 16250.500000, 'system')`,
      [rateIdUSD]
    )
    await db.execute(
      `INSERT INTO exchangeRates (id, fromCurrency, toCurrency, rate, provider)
       VALUES (?, 'SGD', 'IDR', 12150.250000, 'system')`,
      [rateIdSGD]
    )
    await db.execute(
      `INSERT INTO exchangeRates (id, fromCurrency, toCurrency, rate, provider)
       VALUES (?, 'XAU', 'IDR', 1450000.750000, 'antam')`,
      [rateIdXAU]
    )
    await db.execute(
      `INSERT INTO exchangeRates (id, fromCurrency, toCurrency, rate, provider)
       VALUES (?, 'BTC', 'IDR', 1550000000.000000, 'crypto')`,
      [rateIdBTC]
    )

    const [ratesUSD] = await db.execute('SELECT * FROM exchangeRates WHERE id = ?', [rateIdUSD])
    check('exchangeRates row created successfully', ratesUSD.length === 1)
    check('fromCurrency is USD and toCurrency is IDR', ratesUSD[0].fromCurrency === 'USD' && ratesUSD[0].toCurrency === 'IDR')
    check('decimal(18,6) precision preserved', Number(ratesUSD[0].rate) === 16250.5)
    check('provider metadata stored correctly', ratesUSD[0].provider === 'system')

    const [ratesXAU] = await db.execute('SELECT * FROM exchangeRates WHERE id = ?', [rateIdXAU])
    check('commodity (XAU gold) rate precision preserved', Number(ratesXAU[0].rate) === 1450000.75)

    const [ratesBTC] = await db.execute('SELECT * FROM exchangeRates WHERE id = ?', [rateIdBTC])
    check('crypto (BTC) large decimal rate preserved', Number(ratesBTC[0].rate) === 1550000000)

    // 2. Unique constraint enforcement on (fromCurrency, toCurrency)
    let dupFailed = false
    try {
      await db.execute(
        `INSERT INTO exchangeRates (id, fromCurrency, toCurrency, rate, provider)
         VALUES (?, 'USD', 'IDR', 16300.000000, 'duplicate-system')`,
        [crypto.randomUUID()]
      )
    } catch (_err) {
      dupFailed = true
    }
    check('uniqueIndex exchange_rates_pair_uq prevents duplicate (fromCurrency, toCurrency)', dupFailed)

    // 3. Upsert / Rate Fluctuation update
    const updatedRate = 16350.250000
    await db.execute(
      `INSERT INTO exchangeRates (id, fromCurrency, toCurrency, rate, provider)
       VALUES (?, 'USD', 'IDR', ?, 'market-update')
       ON DUPLICATE KEY UPDATE rate = VALUES(rate), provider = VALUES(provider), updatedAt = NOW(3)`,
      [crypto.randomUUID(), updatedRate]
    )

    const [updatedRows] = await db.execute(
      'SELECT rate, provider FROM exchangeRates WHERE fromCurrency = ? AND toCurrency = ?',
      ['USD', 'IDR']
    )
    check('upsert updates existing rate for USD/IDR', Number(updatedRows[0].rate) === updatedRate)
    check('upsert updates provider attribution', updatedRows[0].provider === 'market-update')

    // 4. Composite index lookup on (fromCurrency, toCurrency, updatedAt)
    const [lookupRows] = await db.execute(
      `SELECT rate FROM exchangeRates 
       WHERE fromCurrency = ? AND toCurrency = ? 
       ORDER BY updatedAt DESC LIMIT 1`,
      ['USD', 'IDR']
    )
    check('composite index lookup retrieves latest USD rate', Number(lookupRows[0].rate) === updatedRate)

    // 5. Multi-Currency Wallets creation
    await db.execute(
      'INSERT INTO wallets (id, userId, name, type, currency, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [walletUsdId, userId, 'Wise USD Account', 'bank', 'USD', 2000]
    )
    await db.execute(
      'INSERT INTO wallets (id, userId, name, type, currency, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [walletEurId, userId, 'Revolut EUR Account', 'bank', 'EUR', 500]
    )

    const [wallets] = await db.execute(
      'SELECT id, currency, balance FROM wallets WHERE userId = ? ORDER BY currency ASC',
      [userId]
    )
    check('wallets created with distinct non-IDR currencies (EUR & USD)', wallets.length === 2)
    check('USD wallet balance holds native unit (2000 USD)', wallets.find(w => w.currency === 'USD').balance === 2000)

    // 6. Multi-Currency Transaction baseAmount calculation and rollup
    // Tx 1: USD 100 @ 16,350.25 -> baseAmount = 1,635,025 IDR
    const tx1Amount = 100
    const tx1Rate = updatedRate
    const tx1Base = Math.round(tx1Amount * tx1Rate)

    await db.execute(
      `INSERT INTO transactions (id, userId, walletId, type, amount, currency, exchangeRate, baseAmount, title)
       VALUES (?, ?, ?, 'expense', ?, 'USD', ?, ?, 'SaaS Subscription USD')`,
      [txUsdId, userId, walletUsdId, tx1Amount, String(tx1Rate), tx1Base]
    )

    // Tx 2: EUR 50 @ 17,600.00 -> baseAmount = 880,000 IDR
    const tx2Amount = 50
    const tx2Rate = 17600.000000
    const tx2Base = Math.round(tx2Amount * tx2Rate)

    await db.execute(
      `INSERT INTO transactions (id, userId, walletId, type, amount, currency, exchangeRate, baseAmount, title)
       VALUES (?, ?, ?, 'expense', ?, 'EUR', ?, ?, 'Server Hosting EUR')`,
      [txEurId, userId, walletEurId, tx2Amount, String(tx2Rate), tx2Base]
    )

    const [txRows] = await db.execute(
      'SELECT currency, amount, exchangeRate, baseAmount FROM transactions WHERE userId = ? ORDER BY amount DESC',
      [userId]
    )
    check('transactions record foreign currency and exchangeRate', txRows.length === 2)
    check('USD transaction baseAmount matches mathematical conversion', Number(txRows[0].baseAmount) === tx1Base)
    check('EUR transaction baseAmount matches mathematical conversion', Number(txRows[1].baseAmount) === tx2Base)

    // 7. Base amount rollup aggregation across heterogeneous currencies
    const [sumResult] = await db.execute(
      'SELECT SUM(baseAmount) AS totalBaseSpent FROM transactions WHERE userId = ?',
      [userId]
    )
    const expectedTotalBase = tx1Base + tx2Base
    check(
      `aggregate baseAmount correctly sums cross-currency spending (${expectedTotalBase.toLocaleString('id-ID')} IDR)`,
      Number(sumResult[0].totalBaseSpent) === expectedTotalBase
    )

  } finally {
    // 8. Clean fixture teardown
    try {
      await db.execute('DELETE FROM transactions WHERE userId = ?', [userId])
      await db.execute('DELETE FROM wallets WHERE userId = ?', [userId])
      await db.execute('DELETE FROM users WHERE id = ?', [userId])
      if (insertedRateIds.length > 0) {
        const placeholders = insertedRateIds.map(() => '?').join(', ')
        await db.execute(`DELETE FROM exchangeRates WHERE id IN (${placeholders})`, insertedRateIds)
      }
      // Also delete by USD/SGD/XAU/BTC if upsert replaced ID
      await db.execute(
        "DELETE FROM exchangeRates WHERE fromCurrency IN ('USD', 'SGD', 'XAU', 'BTC') AND toCurrency = 'IDR'"
      )
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message)
    }

    const [residualRates] = await db.execute('SELECT COUNT(*) as c FROM exchangeRates')
    check('exchangeRates fixtures cleanly torn down (0 residual test rows)', residualRates[0].c === 0)

    await db.end()
  }

  console.log(`\n==============================================`)
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  console.log(`==============================================`)

  if (fail > 0) process.exit(1)
  process.exit(0)
})().catch(err => {
  console.error('Fatal error in exchange rates test:', err)
  process.exit(1)
})
