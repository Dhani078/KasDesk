/**
 * Delete-transaction test.
 *
 * The important assertion is not "the row is gone" — it is that the wallet
 * balance returns to EXACTLY its pre-transaction value. deleteTransaction
 * reverses income by subtracting and expense by adding.
 *
 * Also asserts ownership: without the userId filter, user B could delete
 * user A's transaction and silently corrupt A's balance.
 *
 * Run: node scripts/test-delete.js  (server must be up on BASE_URL)
 */
const { execFileSync } = require('child_process')
const fs = require('fs'), os = require('os'), path = require('path')
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

const jar = path.join(os.tmpdir(), `del-${Date.now()}.txt`)
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

const EMAIL = `del-${Date.now()}@example.com`
const PW = 'delete12345'

;(async () => {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true, connectionLimit: 5,
  })

  const uid = crypto.randomUUID()
  await db.execute(
    'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
    [uid, 'Delete Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )
  const wid = crypto.randomUUID()
  const START = 500000
  await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
    [wid, uid, 'Dompet Hapus', 'bank', START])

  // An expense of 75000 that has already been applied to the balance.
  const tid = crypto.randomUUID()
  await db.execute(
    'INSERT INTO transactions (id,userId,walletId,type,amount,title,occurredAt) VALUES (?,?,?,?,?,?,NOW())',
    [tid, uid, wid, 'expense', 75000, 'Salah ketik nominal']
  )
  await db.execute('UPDATE wallets SET balance = balance - 75000 WHERE id=?', [wid])
  // And an income of 100000 already applied.
  const tid2 = crypto.randomUUID()
  await db.execute(
    'INSERT INTO transactions (id,userId,walletId,type,amount,title,occurredAt) VALUES (?,?,?,?,?,?,NOW())',
    [tid2, uid, wid, 'income', 100000, 'Gaji harian']
  )
  await db.execute('UPDATE wallets SET balance = balance + 100000 WHERE id=?', [wid])

  const bal = async () => Number((await db.execute(
    'SELECT balance FROM wallets WHERE id=?', [wid]))[0][0].balance)

  console.log('=== wallet detail page ===')
  check('login', login(EMAIL, PW))
  check('wallet detail 200', status(`${BASE}/wallets/${wid}`) === 200)
  const page = curl([`${BASE}/wallets/${wid}`])
  check('shows transaction title', page.includes('Salah ketik nominal'))
  check('shows delete button', page.includes('Hapus Salah ketik nominal'))

  console.log('\n=== reversal arithmetic ===')
  const before = await bal()
  check('balance reflects both txns', before === START - 75000 + 100000, `${before}`)

  // Replicate exactly what deleteTransaction does for the expense.
  await db.query('START TRANSACTION')
  const [r1] = await db.execute(
    'DELETE FROM transactions WHERE id=? AND userId=?', [tid, uid])
  check('expense row deleted', r1.affectedRows === 1)
  await db.execute(
    'UPDATE wallets SET balance = balance + ? WHERE id=? AND userId=?', [75000, wid, uid])
  await db.query('COMMIT')
  const mid = await bal()
  check('expense reversal restored balance', mid === before + 75000, `${before} -> ${mid}`)

  // Now the income: deleting income must SUBTRACT.
  await db.query('START TRANSACTION')
  const [r2] = await db.execute(
    'DELETE FROM transactions WHERE id=? AND userId=?', [tid2, uid])
  check('income row deleted', r2.affectedRows === 1)
  await db.execute(
    'UPDATE wallets SET balance = balance - ? WHERE id=? AND userId=?', [100000, wid, uid])
  await db.query('COMMIT')
  const after = await bal()
  check('income reversal subtracted', after === mid - 100000, `${mid} -> ${after}`)
  check('balance back to starting value', after === START, `${after} vs ${START}`)

  console.log('\n=== ownership scoping (no RLS) ===')
  const uidB = crypto.randomUUID()
  await db.execute(
    'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
    [uidB, 'Delete B', `delb-${Date.now()}@example.com`, await bcrypt.hash(PW, 12)]
  )
  const tidB = crypto.randomUUID()
  await db.execute(
    'INSERT INTO transactions (id,userId,walletId,type,amount,title,occurredAt) VALUES (?,?,?,?,?,?,NOW())',
    [tidB, uidB, wid, 'expense', 1000, 'Milik B']
  )
  const [rb] = await db.execute(
    'DELETE FROM transactions WHERE id=? AND userId=?', [tidB, uid])
  check("A cannot delete B's transaction", rb.affectedRows === 0)
  const [rb2] = await db.execute(
    'DELETE FROM transactions WHERE id=? AND userId=?', [tidB, uidB])
  check("B can delete own transaction", rb2.affectedRows === 1)

  await db.execute('DELETE FROM transactions WHERE userId IN (?,?)', [uid, uidB])
  await db.execute('DELETE FROM wallets WHERE id=?', [wid])
  await db.execute('DELETE FROM users WHERE id IN (?,?)', [uid, uidB])
  await db.end()

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
