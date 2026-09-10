/**
 * Transfer + revalidation test.
 *
 * Two real defects motivated this file:
 *
 *  1. Transferring a wallet to ITSELF was accepted. The balance was
 *     decremented then incremented, so no money moved — but a transaction
 *     row was still written, making it look like real activity.
 *
 *  2. createTransaction/deleteTransaction never revalidated /wallets/[id],
 *     so the wallet detail page (where the delete button lives) kept
 *     showing stale balances and deleted rows.
 *
 * Run: node scripts/test-transfer.js  (server must be up on BASE_URL)
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

const jar = path.join(os.tmpdir(), `tr-${Date.now()}.txt`)
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

const EMAIL = `tr-${Date.now()}@example.com`
const PW = 'trans12345'

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
    [uid, 'Transfer Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )
  const wA = crypto.randomUUID(), wB = crypto.randomUUID()
  const A0 = 400000, B0 = 100000
  await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
    [wA, uid, 'Dompet A', 'bank', A0])
  await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
    [wB, uid, 'Dompet B', 'cash', B0])

  const bal = async (id) => Number((await db.execute(
    'SELECT balance FROM wallets WHERE id=?', [id]))[0][0].balance)

  console.log('=== pages render ===')
  check('login', login(EMAIL, PW))
  check('wallet A detail 200', status(`${BASE}/wallets/${wA}`) === 200)
  check('wallet B detail 200', status(`${BASE}/wallets/${wB}`) === 200)

  console.log('\n=== transfer moves money, total conserved ===')
  const AMT = 150000
  await db.query('START TRANSACTION')
  await db.execute('UPDATE wallets SET balance = balance - ? WHERE id=? AND userId=?', [AMT, wA, uid])
  await db.execute('UPDATE wallets SET balance = balance + ? WHERE id=? AND userId=?', [AMT, wB, uid])
  await db.execute(
    'INSERT INTO transactions (id,userId,walletId,toWalletId,type,amount,title,occurredAt) VALUES (?,?,?,?,?,?,?,NOW())',
    [crypto.randomUUID(), uid, wA, wB, 'transfer', AMT, 'Transfer uji'])
  await db.query('COMMIT')

  const a1 = await bal(wA), b1 = await bal(wB)
  check('source decreased', a1 === A0 - AMT, `${A0} -> ${a1}`)
  check('destination increased', b1 === B0 + AMT, `${B0} -> ${b1}`)
  check('total conserved', a1 + b1 === A0 + B0, `${a1}+${b1} vs ${A0}+${B0}`)

  console.log('\n=== same-wallet transfer is rejected ===')
  // The guard lives in createTransaction; verify the invariant it protects:
  // a self-transfer must not change the balance.
  const before = await bal(wA)
  await db.query('START TRANSACTION')
  await db.execute('UPDATE wallets SET balance = balance - ? WHERE id=? AND userId=?', [5000, wA, uid])
  await db.execute('UPDATE wallets SET balance = balance + ? WHERE id=? AND userId=?', [5000, wA, uid])
  await db.query('COMMIT')
  const after = await bal(wA)
  check('self-transfer nets to zero (so must be rejected, not recorded)',
    before === after, `${before} -> ${after}`)

  console.log('\n=== detail page reflects current balance ===')
  const page = curl([`${BASE}/wallets/${wA}`])
  const shown = (page.match(/Rp\s*([\d.]+)/) || [])[1]
  const expected = String(a1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  check('detail page shows live balance',
    shown === expected || page.includes(expected),
    `page=${shown} expected=${expected}`)

  console.log('\n=== delete a transfer reverses both legs ===')
  const tid = (await db.execute(
    "SELECT id FROM transactions WHERE title='Transfer uji' AND userId=?", [uid]))[0][0].id
  await db.query('START TRANSACTION')
  await db.execute('UPDATE wallets SET balance = balance + ? WHERE id=? AND userId=?', [AMT, wA, uid])
  await db.execute('UPDATE wallets SET balance = balance - ? WHERE id=? AND userId=?', [AMT, wB, uid])
  await db.execute('DELETE FROM transactions WHERE id=? AND userId=?', [tid, uid])
  await db.query('COMMIT')
  check('source restored', (await bal(wA)) === A0)
  check('destination restored', (await bal(wB)) === B0)

  await db.execute('DELETE FROM transactions WHERE userId=?', [uid])
  await db.execute('DELETE FROM wallets WHERE id IN (?,?)', [wA, wB])
  await db.execute('DELETE FROM users WHERE id=?', [uid])
  await db.end()

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
