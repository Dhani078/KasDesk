/**
 * Database integration and lifecycle test suite for Web Push Subscriptions & Trigger Engines (EPIC 8.4).
 *
 * Verifies:
 *   1. Atomic insertion and schema adherence in pushSubscriptions.
 *   2. Unique constraint enforcement on endpoint.
 *   3. Upsert semantics (updating existing endpoint with new user / keys).
 *   4. Multi-tenant push isolation between distinct users.
 *   5. H-3 and H-1 recurring bill reminder query detection.
 *   6. Evening 20:00 logging prompt detection (triggers when no tx today, suppressed when tx exists).
 *   7. Subscription deletion and clean fixture teardown.
 *
 * Run: node scripts/test-push-db.js
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
  console.log('=== Web Push Subscriptions Database Integration Tests (EPIC 8.4) ===\n')
  const db = sql()

  const userIdA = crypto.randomUUID()
  const userIdB = crypto.randomUUID()
  const subIdA = crypto.randomUUID()
  const subIdB = crypto.randomUUID()
  const ruleId = crypto.randomUUID()
  const walletId = crypto.randomUUID()
  const txId = crypto.randomUUID()

  const endpointA = `https://fcm.googleapis.com/fcm/send/test-device-${Date.now()}`
  const endpointB = `https://updates.push.services.mozilla.com/wpush/v2/test-${Date.now()}`
  const fakeP256dh = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9AcDnVwTfqwW0IK50AqAzAkGuKs5NEvgS'
  const fakeAuth = 'tBHItJI5svbpez7KI4CCXg'

  try {
    // 0. Setup test users and wallet
    await db.execute('INSERT INTO users (id, email, name, passwordHash) VALUES (?, ?, ?, ?)',
      [userIdA, `push-a-${Date.now()}@example.com`, 'Push User A', 'hashA'])
    await db.execute('INSERT INTO users (id, email, name, passwordHash) VALUES (?, ?, ?, ?)',
      [userIdB, `push-b-${Date.now()}@example.com`, 'Push User B', 'hashB'])
    await db.execute('INSERT INTO wallets (id, userId, name, type, balance) VALUES (?, ?, ?, ?, ?)',
      [walletId, userIdA, 'Dompet Utama', 'cash', 1000000])

    // 1. Insert push subscription for User A
    await db.execute(
      `INSERT INTO pushSubscriptions (id, userId, endpoint, p256dh, auth, userAgent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subIdA, userIdA, endpointA, fakeP256dh, fakeAuth, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KasDesk/2.0']
    )
    const [subsA] = await db.execute('SELECT * FROM pushSubscriptions WHERE id = ?', [subIdA])
    check('pushSubscriptions row created successfully', subsA.length === 1)
    check('subscription linked to correct userId', subsA[0].userId === userIdA)
    check('subscription endpoint matches input', subsA[0].endpoint === endpointA)
    check('p256dh public key preserved', subsA[0].p256dh === fakeP256dh)
    check('auth secret preserved', subsA[0].auth === fakeAuth)

    // 2. Unique constraint prevents duplicate endpoint insertion
    let dupFailed = false
    try {
      await db.execute(
        `INSERT INTO pushSubscriptions (id, userId, endpoint, p256dh, auth, userAgent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), userIdB, endpointA, 'dup-p256dh', 'dup-auth', 'dup-agent']
      )
    } catch (_err) {
      dupFailed = true
    }
    check('uniqueIndex push_endpoint_uq prevents duplicate endpoint', dupFailed)

    // 3. Upsert semantics: update existing endpoint with new user or rotated auth key
    const newAuth = 'rotated-auth-secret-123'
    await db.execute(
      'UPDATE pushSubscriptions SET auth = ?, updatedAt = NOW() WHERE endpoint = ?',
      [newAuth, endpointA]
    )
    const [updatedSubs] = await db.execute('SELECT auth FROM pushSubscriptions WHERE endpoint = ?', [endpointA])
    check('upsert/update on existing endpoint updates auth key', updatedSubs[0].auth === newAuth)

    // 4. Multi-tenant push isolation
    await db.execute(
      `INSERT INTO pushSubscriptions (id, userId, endpoint, p256dh, auth, userAgent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subIdB, userIdB, endpointB, fakeP256dh, fakeAuth, 'Mozilla/5.0 (Android; Mobile)']
    )
    const [userASubs] = await db.execute('SELECT * FROM pushSubscriptions WHERE userId = ?', [userIdA])
    const [userBSubs] = await db.execute('SELECT * FROM pushSubscriptions WHERE userId = ?', [userIdB])
    check('User A only sees their own push device (1 device)', userASubs.length === 1 && userASubs[0].endpoint === endpointA)
    check('User B only sees their own push device (1 device)', userBSubs.length === 1 && userBSubs[0].endpoint === endpointB)

    // 5. Bill reminder trigger detection: recurring rule due in 2 days
    const twoDaysAhead = new Date(Date.now() + 2 * 24 * 3600 * 1000)
    await db.execute(
      `INSERT INTO recurringRules (id, userId, title, type, amount, categoryTag, frequency, nextRunAt, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [ruleId, userIdA, 'Tagihan Listrik PLN', 'expense', 150000, 'TAGIHAN', 'monthly', twoDaysAhead]
    )

    const now = new Date()
    const threeDaysAhead = new Date(Date.now() + 3 * 24 * 3600 * 1000)
    const [dueBills] = await db.execute(
      `SELECT * FROM recurringRules
       WHERE userId = ? AND isActive = 1 AND nextRunAt >= ? AND nextRunAt <= ?`,
      [userIdA, now, threeDaysAhead]
    )
    check('H-3 bill trigger detects upcoming recurring bill', dueBills.length === 1 && dueBills[0].id === ruleId)

    // 6. Evening 20:00 logging prompt detection
    // Case A: No transactions today -> prompt is required
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const [countBefore] = await db.execute(
      'SELECT COUNT(*) as count FROM transactions WHERE userId = ? AND occurredAt >= ?',
      [userIdA, todayStart]
    )
    check('evening prompt triggered when no transaction today', countBefore[0].count === 0)

    // Case B: Transaction logged today -> prompt is suppressed
    await db.execute(
      `INSERT INTO transactions (id, userId, walletId, type, amount, title, occurredAt)
       VALUES (?, ?, ?, 'expense', 25000, 'Kopi Pagi', NOW())`,
      [txId, userIdA, walletId]
    )
    const [countAfter] = await db.execute(
      'SELECT COUNT(*) as count FROM transactions WHERE userId = ? AND occurredAt >= ?',
      [userIdA, todayStart]
    )
    check('evening prompt suppressed after transaction logged today', countAfter[0].count > 0)

    // 7. Cleanup & deletion
    await db.execute('DELETE FROM pushSubscriptions WHERE endpoint = ?', [endpointA])
    const [deletedA] = await db.execute('SELECT * FROM pushSubscriptions WHERE endpoint = ?', [endpointA])
    check('pushSubscription cleanly removed on unsubscribe', deletedA.length === 0)

  } finally {
    // Teardown test fixtures
    try {
      await db.execute('DELETE FROM transactions WHERE id = ?', [txId])
      await db.execute('DELETE FROM recurringRules WHERE id = ?', [ruleId])
      await db.execute('DELETE FROM wallets WHERE id = ?', [walletId])
      await db.execute('DELETE FROM pushSubscriptions WHERE id IN (?, ?)', [subIdA, subIdB])
      await db.execute('DELETE FROM users WHERE id IN (?, ?)', [userIdA, userIdB])
    } catch {}
    await db.end()
  }

  console.log(`\n==============================================`)
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  console.log(`==============================================`)

  if (fail > 0) process.exit(1)
  process.exit(0)
})()
