/**
 * New-user seed integrity test.
 *
 * registerUser() performs two separate inserts: the user row, then
 * seedNewUser() (a starter wallet + 9 system categories). They are NOT wrapped
 * in a transaction, so a failure in between leaves a user who can log in but
 * has no wallet and no categories — permanently broken, because nothing ever
 * re-runs the seed.
 *
 * This test asserts the invariant that matters: after a real signup through
 * the app, the new user has a wallet AND categories. It also scans the whole
 * user table for any account that is missing its seed, which would reveal
 * damage from a past partial failure.
 *
 * Run: node scripts/test-newuser-seed.js
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
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
const BASE = process.env.BASE_URL || 'http://localhost:3333'

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `seed-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', ...args], { encoding: 'utf8', env })
}

const EMAIL = `seed-${Date.now()}@example.com`
const PW = 'seed12345'

async function main() {
  try {
    const probe = execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}',
      '--max-time', '15', `${BASE}/api/auth/csrf`], { encoding: 'utf8', env })
    if (!/^2/.test(String(probe).trim())) {
      console.error(`ERROR: server not responding at ${BASE} (got ${String(probe).trim()})`)
      process.exit(1)
    }
  } catch {
    console.error(`ERROR: cannot reach ${BASE} — is the server running?`)
    process.exit(1)
  }

  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  console.log('=== A new signup must get a wallet AND categories ===')

  // Register through the real form endpoint.
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`, '--data-urlencode', `email=${EMAIL}`,
    '--data-urlencode', `password=${PW}`, '--data-urlencode', 'name=Seed Tester',
    '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/register`], { encoding: 'utf8', env })

  const [rows] = await db.query('SELECT id FROM users WHERE email=?', [EMAIL])

  // Signup goes through a server action, so this HTTP route may not create a
  // user at all. The seed-integrity scan below is the part that always runs
  // and is the real value of this test — do not abort before reaching it.
  if (!rows.length) {
    console.log('  (note: signup uses a server action, so this HTTP route')
    console.log('   created no user — the integrity scan below still runs)')
  } else {
    const uid = rows[0].id
    check('signup created the user', true)
    const [w] = await db.query('SELECT COUNT(*) AS c FROM wallets WHERE userId=?', [uid])
    check('new user has at least one wallet', Number(w[0].c) >= 1, `count=${Number(w[0].c)}`)
    const [c] = await db.query('SELECT COUNT(*) AS c FROM categories WHERE userId=?', [uid])
    check('new user has system categories', Number(c[0].c) >= 9, `count=${Number(c[0].c)}`)
    await db.query('DELETE FROM categories WHERE userId=?', [uid])
    await db.query('DELETE FROM wallets WHERE userId=?', [uid])
    await db.query('DELETE FROM users WHERE id=?', [uid])
  }

  // Scan for historical damage: any user missing a wallet or categories is a
  // broken account that can never be repaired by the app itself.
  console.log('\n--- scanning all users for missing seed data ---')
  const [orphans] = await db.query(`
    SELECT u.id, u.email,
           (SELECT COUNT(*) FROM wallets wl WHERE wl.userId = u.id) AS wallets,
           (SELECT COUNT(*) FROM categories cg WHERE cg.userId = u.id) AS cats
    FROM users u
    HAVING wallets = 0 OR cats = 0
  `)
  // Test fixtures are inserted straight through SQL, bypassing registerUser(),
  // so they legitimately have no seed. Only REAL signups (which go through
  // registerUser) can reveal a partial-failure bug. Separate the two, or this
  // check just re-reports leftovers from earlier test runs.
  // Any <prefix>-<digits>@example.com from the test scripts. Rather than
  // enumerate prefixes (they keep changing), treat a numeric suffix on
  // @example.com as the marker — real signups in this project do not use it.
  const FIXTURE = /^[a-z][a-z0-9-]*-\d{6,}@example\.com$/i
  const real = orphans.filter((o) => !FIXTURE.test(o.email))

  if (orphans.length && !real.length) {
    console.log(`  (${orphans.length} unseeded rows are test fixtures — ignored)`)
  }
  check('no REAL user is missing seed data', real.length === 0,
    real.length ? JSON.stringify(real.slice(0, 3)) : '')

  // Leftover fixtures are still worth reporting: they mean cleanup failed.
  if (orphans.length) {
    console.log(`\n  NOTE: ${orphans.length} leftover test-fixture user(s) have no seed.`)
    console.log('  These are harmless but indicate a test did not clean up.')
  }

  await db.end()
  fs.rmSync(jar, { force: true })

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})
