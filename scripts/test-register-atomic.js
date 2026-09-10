/**
 * Transactional registration test.
 *
 * registerUser() must create the user AND its seed data (starter wallet +
 * system categories) as one unit. Before the fix it did two separate inserts,
 * so a failure in between left a user who could log in but had no wallet and
 * no categories — permanently broken, because nothing ever re-runs the seed.
 *
 * Forcing a mid-way failure through the app is hard, so this test reproduces
 * the same sequence directly against the database:
 *
 *   1. Replicate the OLD behaviour (insert user, then seed, no transaction)
 *      while making the seed fail -> a user row must be LEFT BEHIND.
 *      This proves the failure mode is real, not theoretical.
 *   2. Replicate the NEW behaviour (both inside one transaction) with the
 *      same forced failure -> NO user row may remain.
 *
 * If step 1 stops leaving a row behind, the test is no longer demonstrating
 * anything and says so.
 *
 * Run: node scripts/test-register-atomic.js
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

const CATS = ['MAKAN', 'TRANSPORT', 'BELANJA', 'TAGIHAN', 'HIBURAN',
  'KESEHATAN', 'PENDIDIKAN', 'LAINNYA', 'GAJI']

async function main() {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  console.log('=== Registration must be atomic: user + seed land together ===')

  // A category name that is too long for the column forces the seed to fail.
  const [col] = await db.query(
    `SELECT CHARACTER_MAXIMUM_LENGTH AS len FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'name'`,
    [env.DATABASE_NAME]
  )
  const nameLen = Number(col[0]?.len || 32)
  const TOO_LONG = 'X'.repeat(nameLen + 50)

  // ---- Step 1: OLD behaviour (two separate inserts, no transaction) ----
  const oldEmail = `atomic-old-${Date.now()}@example.com`
  let oldLeftBehind = false
  try {
    await db.query(
      'INSERT INTO users (id,email,name,passwordHash) VALUES (?,?,?,?)',
      [crypto.randomUUID(), oldEmail, 'Old', 'x']
    )
    // This is where the seed would run — make it fail.
    await db.query(
      'INSERT INTO categories (id,userId,name,kind,sortOrder,isSystem) VALUES (?,?,?,?,?,?)',
      [crypto.randomUUID(), 'no-such-user', TOO_LONG, 'expense', 1, 1]
    )
  } catch {
    /* expected: the seed fails */
  }
  const [oldRows] = await db.query('SELECT id FROM users WHERE email=?', [oldEmail])
  oldLeftBehind = oldRows.length > 0
  await db.query('DELETE FROM users WHERE email=?', [oldEmail])

  check('OLD behaviour leaves a user behind when the seed fails', oldLeftBehind,
    'no row left — this test no longer demonstrates the failure mode')

  // ---- Step 2: NEW behaviour (both inside one transaction) ----
  const newEmail = `atomic-new-${Date.now()}@example.com`
  const uid = crypto.randomUUID()
  let rolledBack = false
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      'INSERT INTO users (id,email,name,passwordHash) VALUES (?,?,?,?)',
      [uid, newEmail, 'New', 'x']
    )
    await conn.query(
      'INSERT INTO categories (id,userId,name,kind,sortOrder,isSystem) VALUES (?,?,?,?,?,?)',
      [crypto.randomUUID(), uid, TOO_LONG, 'expense', 1, 1]
    )
    await conn.commit()
  } catch {
    await conn.rollback()
  } finally {
    conn.release()
  }
  const [newRows] = await db.query('SELECT id FROM users WHERE email=?', [newEmail])
  rolledBack = newRows.length === 0
  await db.query('DELETE FROM users WHERE email=?', [newEmail])

  check('NEW behaviour rolls back: no user left when the seed fails', rolledBack,
    `${newRows.length} row(s) survived`)

  // ---- Step 3: the happy path still produces a complete account ----
  const okEmail = `atomic-ok-${Date.now()}@example.com`
  const okId = crypto.randomUUID()
  const c2 = await db.getConnection()
  try {
    await c2.beginTransaction()
    await c2.query(
      'INSERT INTO users (id,email,name,passwordHash) VALUES (?,?,?,?)',
      [okId, okEmail, 'Ok', 'x']
    )
    await c2.query(
      'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,0)',
      [crypto.randomUUID(), okId, 'Tunai', 'cash', 0]
    )
    for (let i = 0; i < CATS.length; i++) {
      await c2.query(
        'INSERT INTO categories (id,userId,name,kind,sortOrder,isSystem) VALUES (?,?,?,?,?,?)',
        [crypto.randomUUID(), okId, CATS[i], 'expense', i + 1, 1]
      )
    }
    await c2.commit()
  } catch (e) {
    await c2.rollback()
  } finally {
    c2.release()
  }

  const [wOk] = await db.query('SELECT COUNT(*) AS c FROM wallets WHERE userId=?', [okId])
  const [cOk] = await db.query('SELECT COUNT(*) AS c FROM categories WHERE userId=?', [okId])
  check('happy path creates the wallet', Number(wOk[0].c) === 1, `count=${Number(wOk[0].c)}`)
  check('happy path creates all 9 categories', Number(cOk[0].c) === 9, `count=${Number(cOk[0].c)}`)

  await db.query('DELETE FROM categories WHERE userId=?', [okId])
  await db.query('DELETE FROM wallets WHERE userId=?', [okId])
  await db.query('DELETE FROM users WHERE id=?', [okId])
  await db.end()

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})
