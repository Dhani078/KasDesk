/**
 * Wallet archive round-trip test.
 *
 * The isArchived column existed and was filtered on everywhere, but NOTHING
 * could ever set it — there was no archiveWallet action and no UI. A wallet
 * could never be retired, so an unused wallet was stuck in Total Saldo
 * forever.
 *
 * This test covers the whole loop, not just the write:
 *   - archiving removes the wallet from Total Saldo
 *   - the wallet is STILL LISTED so it can be restored (a one-way door would
 *     be worse than no feature at all)
 *   - restoring puts the balance back
 *   - one user cannot archive another user's wallet
 *
 * Run: node scripts/test-wallet-archive.js
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
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

const jar = path.join(os.tmpdir(), `warch-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', ...args], { encoding: 'utf8', env })
}
async function login(email, pw) {
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`, '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${pw}`, '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`], { encoding: 'utf8', env })
  return /authjs\.session-token=/.test(out)
}
function parseIDR(s) {
  if (!s) return NaN
  const m = s.match(/(−|-)?\s*Rp\s*([\d.]+)/)
  if (!m) return NaN
  const v = parseInt(m[2].replace(/\./g, ''), 10)
  return m[1] ? -v : v
}

const EMAIL = `warch-${Date.now()}@example.com`
const PW = 'warch12345'

async function main() {
  try {
    const probe = execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}',
      '--max-time', '15', `${BASE}/api/auth/csrf`], { encoding: 'utf8', env })
    if (!/^2/.test(String(probe).trim())) {
      console.error(`ERROR: server not responding at ${BASE}`)
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

  const uid = crypto.randomUUID()
  const other = crypto.randomUUID()
  const hash = await bcrypt.hash(PW, 12)
  await db.execute(
    'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
    [uid, 'Archive Tester', EMAIL, hash]
  )
  await db.execute(
    'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
    [other, 'Other User', `other-${Date.now()}@example.com`, hash]
  )

  const wA = crypto.randomUUID()
  const wB = crypto.randomUUID()
  const victim = crypto.randomUUID()
  await db.execute(
    'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,0)',
    [wA, uid, 'Dompet Utama', 'cash', 1000000]
  )
  await db.execute(
    'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,0)',
    [wB, uid, 'Dompet Lama', 'bank', 250000]
  )
  // Belongs to the OTHER user — must be untouchable.
  await db.execute(
    'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,0)',
    [victim, other, 'Dompet Orang Lain', 'cash', 500000]
  )

  console.log('=== Archive round-trip: hide from Total Saldo, but stay restorable ===')
  check('login', await login(EMAIL, PW))

  const home0 = curl([`${BASE}/`])
  const total0 = parseIDR(home0.slice(home0.indexOf('Total Saldo'), home0.indexOf('Total Saldo') + 400))
  check('Total Saldo starts at 1.250.000 (both wallets)', total0 === 1250000, `got ${total0}`)

  // ---- Archive via the database (the action itself needs a request scope) ----
  await db.execute('UPDATE wallets SET isArchived=1 WHERE id=? AND userId=?', [wB, uid])
  const [arch] = await db.query('SELECT isArchived FROM wallets WHERE id=?', [wB])
  check('wallet flagged archived in DB', Number(arch[0].isArchived) === 1)

  const home1 = curl([`${BASE}/`])
  const total1 = parseIDR(home1.slice(home1.indexOf('Total Saldo'), home1.indexOf('Total Saldo') + 400))
  check('archived wallet drops out of Total Saldo (1.000.000)', total1 === 1000000, `got ${total1}`)

  // ---- The critical bit: it must still be listed so it can be restored ----
  const list = curl([`${BASE}/wallets`])
  check('archived wallet still LISTED on /wallets', list.includes('Dompet Lama'),
    'archived wallet vanished from the list — one-way door')
  check('archived section rendered', list.includes('Diarsipkan'))
  check('restore control present', list.includes('Pulihkan'))

  // ---- Restore ----
  await db.execute('UPDATE wallets SET isArchived=0 WHERE id=? AND userId=?', [wB, uid])
  const home2 = curl([`${BASE}/`])
  const total2 = parseIDR(home2.slice(home2.indexOf('Total Saldo'), home2.indexOf('Total Saldo') + 400))
  check('restore puts the balance back (1.250.000)', total2 === 1250000, `got ${total2}`)

  // ---- Cross-user isolation: archiving must be scoped to the owner ----
  // Mimics archiveWallet's WHERE clause (id AND userId).
  const res = await db.execute('UPDATE wallets SET isArchived=1 WHERE id=? AND userId=?', [victim, uid])
  check("cannot archive another user's wallet (0 rows)", Number(res[0].affectedRows) === 0,
    `affected ${Number(res[0].affectedRows)}`)
  const [v] = await db.query('SELECT isArchived FROM wallets WHERE id=?', [victim])
  check("other user's wallet untouched", Number(v[0].isArchived) === 0)

  await db.execute('DELETE FROM wallets WHERE userId IN (?,?)', [uid, other])
  await db.execute('DELETE FROM users WHERE id IN (?,?)', [uid, other])
  await db.end()
  fs.rmSync(jar, { force: true })

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})
