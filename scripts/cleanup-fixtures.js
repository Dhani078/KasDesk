/**
 * Remove leftover test-fixture users from the database.
 *
 * Why this exists: most test scripts create a user directly through SQL
 * instead of going through registerUser(), so their rows are never seeded and
 * some are never deleted when a run fails part-way. They accumulate and start
 * showing up in scans as "users with no wallet/categories", which looks like
 * real corruption.
 *
 * Safety: only deletes emails matching the fixture pattern
 *   <prefix>-<timestamp>@example.com
 * Real signups in this project never use that shape. Anything that does not
 * match is left untouched.
 *
 * Usage:   node scripts/cleanup-fixtures.js          (report only)
 *          node scripts/cleanup-fixtures.js --apply  (delete)
 */
const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

const env = {}
for (const raw of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

// Deliberately narrow: a numeric suffix on @example.com, which every test
// script uses (arch-1789…, dash-1789…, zz-1789…, seed-1789…, etc).
// The digits are a ms timestamp, so real signups never match this shape.
const FIXTURE = '-[0-9]{6,}@example'

async function main() {
  const apply = process.argv.includes('--apply')
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  const [total] = await db.query('SELECT COUNT(*) AS c FROM users')
  const [rows] = await db.query(
    `SELECT id, email FROM users WHERE email REGEXP ?`, [FIXTURE]
  )

  console.log(`users total : ${Number(total[0].c)}`)
  console.log(`fixtures    : ${rows.length}`)
  for (const r of rows.slice(0, 20)) console.log(`  - ${r.email}`)
  if (rows.length > 20) console.log(`  … and ${rows.length - 20} more`)

  if (!rows.length) {
    console.log('\nnothing to clean.')
    await db.end()
    return
  }

  if (!apply) {
    console.log('\n(report only — re-run with --apply to delete)')
    await db.end()
    return
  }

  const ids = rows.map((r) => r.id)
  const ph = ids.map(() => '?').join(',')
  // Order matters: children before parents.
  await db.query(`DELETE FROM transactions WHERE userId IN (${ph})`, ids)
  await db.query(`DELETE FROM categories WHERE userId IN (${ph})`, ids)
  await db.query(`DELETE FROM vaults WHERE userId IN (${ph})`, ids)
  await db.query(`DELETE FROM debts WHERE userId IN (${ph})`, ids)
  await db.query(`DELETE FROM wallets WHERE userId IN (${ph})`, ids)
  await db.query(`DELETE FROM users WHERE id IN (${ph})`, ids)

  const [after] = await db.query('SELECT COUNT(*) AS c FROM users')
  console.log(`\ndeleted ${rows.length} fixture user(s). users now: ${Number(after[0].c)}`)
  await db.end()
}

main().catch((e) => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})
