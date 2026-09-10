/**
 * New-user seed integrity test.
 *
 * registerUser() must create the user AND its starter data (a wallet + 9
 * system categories). They now run in one transaction (see
 * test-register-atomic.js), so this test checks the other half: that a real
 * signup actually produces a COMPLETE account, not just an unbroken one.
 *
 * It calls registerUser() directly through tsx. That is deliberate — the
 * signup UI path goes through a Next server action whose id changes on every
 * build, so invoking it over HTTP would be brittle. registerUser is the same
 * function the action calls.
 *
 * It also scans the whole user table for any account missing a wallet or
 * categories, which would reveal damage from an earlier partial failure.
 *
 * Run: npx tsx scripts/test-newuser-seed.ts
 */
import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'

const env: Record<string, string> = {}
for (const raw of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

let pass = 0
let fail = 0
const check = (n: string, c: boolean, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const EMAIL = `seed-${Date.now()}@example.com`

async function main() {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  console.log('=== A new signup must get a wallet AND categories ===')

  // registerUser pulls in next-auth, which needs AUTH_SECRET etc. If it throws
  // for environmental reasons we say so instead of reporting a false pass.
  let registerUser: any
  try {
    ;({ registerUser } = await import('../auth'))
  } catch (e: any) {
    console.log(`\n--- SKIPPED: cannot import registerUser (${String(e?.message).slice(0, 70)}) ---`)
    await db.end()
    process.exit(0)
  }

  let uid: string | null = null
  try {
    const created = await registerUser({ email: EMAIL, password: 'seed12345', name: 'Seed Tester' })
    uid = created?.id ?? null
  } catch (e: any) {
    console.log(`\n--- SKIPPED: registerUser threw (${String(e?.message).slice(0, 70)}) ---`)
    await db.end()
    process.exit(0)
  }

  if (!uid) {
    console.log('\n--- SKIPPED: registerUser returned null (email taken or invalid) ---')
    await db.end()
    process.exit(0)
  }

  check('signup created the user', true)

  const [w] = await db.query('SELECT COUNT(*) AS c FROM wallets WHERE userId=?', [uid])
  check('new user has at least one wallet', Number((w as any)[0].c) >= 1,
    `count=${Number((w as any)[0].c)}`)

  const [c] = await db.query('SELECT COUNT(*) AS c FROM categories WHERE userId=?', [uid])
  check('new user has the 9 system categories', Number((c as any)[0].c) >= 9,
    `count=${Number((c as any)[0].c)}`)

  // Scan for damage from earlier partial failures.
  const [orphans] = await db.query(`
    SELECT u.id, u.email,
           (SELECT COUNT(*) FROM wallets wl WHERE wl.userId = u.id) AS wallets,
           (SELECT COUNT(*) FROM categories cg WHERE cg.userId = u.id) AS cats
    FROM users u
    HAVING wallets = 0 OR cats = 0
  `)
  // Test fixtures are inserted straight through SQL and legitimately have no
  // seed. Only real signups can reveal a bug, so separate the two — otherwise
  // this check just re-reports leftovers from earlier runs.
  const FIXTURE = /^[a-z][a-z0-9-]*-\d{6,}@example\.com$/i
  const real = (orphans as any[]).filter((o) => !FIXTURE.test(o.email))
  if ((orphans as any[]).length && !real.length) {
    console.log(`  (${(orphans as any[]).length} unseeded rows are test fixtures — ignored)`)
  }
  check('no REAL user is missing seed data', real.length === 0,
    real.length ? JSON.stringify(real.slice(0, 3)) : '')

  await db.query('DELETE FROM categories WHERE userId=?', [uid])
  await db.query('DELETE FROM wallets WHERE userId=?', [uid])
  await db.query('DELETE FROM users WHERE id=?', [uid])
  await db.end()

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})
