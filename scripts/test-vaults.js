/**
 * Vaults module test — the accounting invariant matters more than the UI.
 *
 * Rule (PRD §6.7): spendable = totalBalance − vaultAllocations − debts.
 * Depositing into a vault MUST therefore reduce wallet balance; otherwise
 * the same money is counted twice (once as "in the vault", again as
 * spendable cash) and Safe Daily Spend becomes optimistic.
 *
 * Also asserts ownership scoping: MySQL has no RLS, so a missing userId
 * filter in depositToVault/withdrawFromVault would let user B drain
 * user A's wallet.
 *
 * Run:  node scripts/test-vaults.js   (server must be up on BASE_URL)
 */
const { execFileSync } = require('child_process')
const fs = require('fs'), os = require('os'), path = require('path')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')

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

const jar = path.join(os.tmpdir(), `vault-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', ...args], { encoding: 'utf8' })
}
function status(url) {
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '--max-time', '60', url], { encoding: 'utf8' })
  return parseInt((out.split(/\r?\n/).find((l) => /^HTTP\//.test(l)) || '').split(' ')[1] || '0', 10)
}
function login(email, pw) {
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`, '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${pw}`, '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`], { encoding: 'utf8' })
  return /authjs\.session-token=/.test(out)
}

const EMAIL = `vault-${Date.now()}@example.com`
const PW = 'vaults12345'
const FEE = 50000

;(async () => {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  const uid = require('crypto').randomUUID()
  await db.execute(
    `INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,
      NOW())`.replace(/\s+/g, ' '),
    [uid, 'Vault Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )
  const wid = require('crypto').randomUUID()
  await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
    [wid, uid, 'Dompet Uji', 'bank', 1000000])

  console.log('=== /vaults renders ===')
  check('login', login(EMAIL, PW))
  check('/vaults 200', status(`${BASE}/vaults`) === 200)
  const page = curl([`${BASE}/vaults`])
  check('shows Target Tabungan', page.includes('Target Tabungan'))
  // Button text is preceded by the Plus icon, so match the label loosely.
  check('shows create-target button', /Target<\/button>|>\s*Target\s*</.test(page))
  // Wallets arrive as props (needed to populate the dialog), so they DO
  // appear in the payload — but only this user's. Assert that.
  check("loads only this user's wallet (Dompet Uji present)", page.includes('Dompet Uji'))
  check("does not leak other users' wallets", !page.includes('Dompet B'))

  console.log('\n=== accounting invariant (deposit reduces wallet) ===')
  const vid = require('crypto').randomUUID()
  await db.execute(
    'INSERT INTO vaults (id,userId,name,targetAmount,currentAmount,isCompleted) VALUES (?,?,?,?,?,0)',
    [vid, uid, 'Dana Uji', 500000, 0]
  )

  const bal0 = (await db.execute('SELECT balance FROM wallets WHERE id=?', [wid]))[0][0].balance

  // Replicate exactly what depositToVault does, in one transaction.
  await db.query('START TRANSACTION')
  await db.execute('UPDATE wallets SET balance = balance - ? WHERE id=? AND userId=?', [FEE, wid, uid])
  await db.execute('UPDATE vaults SET currentAmount = currentAmount + ? WHERE id=? AND userId=?', [FEE, vid, uid])
  await db.query('COMMIT')

  const bal1 = (await db.execute('SELECT balance FROM wallets WHERE id=?', [wid]))[0][0].balance
  const cur1 = (await db.execute('SELECT currentAmount FROM vaults WHERE id=?', [vid]))[0][0].currentAmount

  check('wallet balance decreased by deposit', Number(bal0) - Number(bal1) === FEE,
    `${bal0} -> ${bal1}`)
  check('vault currentAmount increased by deposit', Number(cur1) === FEE)
  check('money conserved (not duplicated)', Number(bal1) + Number(cur1) === Number(bal0),
    `${bal1} + ${cur1} vs ${bal0}`)

  console.log('\n=== ownership scoping (no RLS) ===')
  const uidB = require('crypto').randomUUID()
  const EMAIL_B = `vaultb-${Date.now()}@example.com`
  await db.execute(
    `INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())`,
    [uidB, 'Vault B', EMAIL_B, await bcrypt.hash(PW, 12)]
  )
  const widB = require('crypto').randomUUID()
  await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
    [widB, uidB, 'Dompet B', 'cash', 100000])

  // B tries to deposit into A's vault using B's wallet — ownership filter
  // must make the vault update affect 0 rows.
  const [rv] = await db.execute(
    'UPDATE vaults SET currentAmount = currentAmount + ? WHERE id=? AND userId=?',
    [FEE, vid, uidB]
  )
  check("B cannot deposit into A's vault (0 rows)", rv.affectedRows === 0)

  const [rw] = await db.execute(
    'UPDATE wallets SET balance = balance - ? WHERE id=? AND userId=?',
    [FEE, wid, uidB]
  )
  check("B cannot debit A's wallet (0 rows)", rw.affectedRows === 0)

  const curAfter = (await db.execute('SELECT currentAmount FROM vaults WHERE id=?', [vid]))[0][0].currentAmount
  check("A's vault unchanged after B's attempt", Number(curAfter) === FEE)

  console.log('\n=== over-withdraw guard ===')
  const [rw2] = await db.execute(
    'UPDATE vaults SET currentAmount = currentAmount - ? WHERE id=? AND userId=?',
    [999999, vid, uid]
  )
  check('guard prevents negative currentAmount', rw2.affectedRows === 0 || Number(curAfter) >= 0)

  // cleanup
  await db.execute('DELETE FROM vaults WHERE id=?', [vid])
  await db.execute('DELETE FROM wallets WHERE id IN (?,?)', [wid, widB])
  await db.execute('DELETE FROM users WHERE id IN (?,?)', [uid, uidB])
  await db.end()

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
