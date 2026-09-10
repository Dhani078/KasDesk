/**
 * Cross-user isolation test (the RLS replacement).
 *
 * MySQL has no Row Level Security, so the ONLY thing stopping user B from
 * reading user A's wallet is the `userId` filter in the query. This asserts
 * that filter actually works over HTTP: B requesting A's wallet must 404.
 *
 * Run:  node scripts/test-isolation.js   (server must be up on BASE_URL)
 */
const { execFileSync } = require('child_process')
const fs = require('fs'), os = require('os'), path = require('path')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

function loadEnv(f) {
  const o = {}
  for (const raw of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const l = raw.trim(); const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) o[m[1]] = m[2].trim()
  }
  return o
}
const env = loadEnv(path.join(__dirname, '..', '.env.local'))
const BASE = process.env.BASE_URL || 'http://localhost:3333'

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d}`) }
}

function login(jar, email, password) {
  const get = (u) => execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', u],
    { encoding: 'utf8' })
  const csrf = JSON.parse(get(`${BASE}/api/auth/csrf`)).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`,
    '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${password}`,
    '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`], { encoding: 'utf8' })
  return /authjs\.session-token=/.test(out)
}
function status(jar, url) {
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '--max-time', '60', url], { encoding: 'utf8' })
  return parseInt((out.split(/\r?\n/).find((l) => /^HTTP\//.test(l)) || '').split(' ')[1] || '0', 10)
}

const jarA = path.join(os.tmpdir(), `iso-a-${Date.now()}.txt`)
const jarB = path.join(os.tmpdir(), `iso-b-${Date.now()}.txt`)
const emailA = `iso-a-${Date.now()}@example.com`
const emailB = `iso-b-${Date.now()}@example.com`
const PW = 'isolation123'
const ids = []

;(async () => {
  const db = await mysql.createPool({
    host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
    user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  })

  try {
    // Two users, each with a distinctively named wallet
    const idA = crypto.randomUUID(), idB = crypto.randomUUID()
    ids.push(idA, idB)
    const hash = await bcrypt.hash(PW, 12)
    for (const [id, email, wname] of [[idA, emailA, 'Dompet Rahasia A'], [idB, emailB, 'Dompet B']]) {
      await db.execute('INSERT INTO users (id,email,name,passwordHash) VALUES (?,?,?,?)',
        [id, email, 'Iso ' + wname, hash])
      await db.execute('INSERT INTO wallets (id,userId,name,type,balance) VALUES (?,?,?,?,?)',
        [crypto.randomUUID(), id, wname, 'cash', 1000000])
    }

    const [wa] = await db.execute('SELECT id FROM wallets WHERE userId=?', [idA])
    const walletA = wa[0].id
    const [wb] = await db.execute('SELECT id FROM wallets WHERE userId=?', [idB])
    const walletB = wb[0].id

    console.log('\n=== 1. BOTH USERS CAN LOG IN ===')
    check('A logged in', login(jarA, emailA, PW))
    check('B logged in', login(jarB, emailB, PW))

    console.log('\n=== 2. EACH SEES THEIR OWN WALLET ===')
    check('A opens own wallet detail (200)', status(jarA, `${BASE}/wallets/${walletA}`) === 200,
      `got ${status(jarA, `${BASE}/wallets/${walletA}`)}`)
    check('B opens own wallet detail (200)', status(jarB, `${BASE}/wallets/${walletB}`) === 200,
      `got ${status(jarB, `${BASE}/wallets/${walletB}`)}`)

    console.log('\n=== 3. B CANNOT OPEN A\'s WALLET (the critical test) ===')
    const cross = status(jarB, `${BASE}/wallets/${walletA}`)
    check("B gets 404 on A's wallet", cross === 404, `got ${cross}`)

    console.log('\n=== 4. WALLET LIST IS PER-USER ===')
    const listB = execFileSync('curl', ['-s', '-b', jarB, '-c', jarB, '--max-time', '60',
      `${BASE}/wallets`], { encoding: 'utf8' })
    check("B's list does not contain A's wallet name", !listB.includes('Dompet Rahasia A'))
    check("B's list contains B's wallet", listB.includes('Dompet B'))

    console.log('\n=== 5. HOME SHOWS DIFFERENT BALANCES PER USER ===')
    const homeA = execFileSync('curl', ['-s', '-b', jarA, '-c', jarA, '--max-time', '60',
      `${BASE}/`], { encoding: 'utf8' })
    const homeB = execFileSync('curl', ['-s', '-b', jarB, '-c', jarB, '--max-time', '60',
      `${BASE}/`], { encoding: 'utf8' })
    check('A home shows A balance 1.000.000', homeA.includes('1.000.000'))
    check('B home shows B balance 1.000.000', homeB.includes('1.000.000'))
    check("A home does not leak B's wallet name", !homeA.includes('Dompet B'))

    console.log(`\n${'='.repeat(46)}`)
    console.log(`RESULT: ${pass} passed, ${fail} failed`)
    console.log('='.repeat(46))
  } catch (e) {
    console.error('ERROR:', e.message); fail++
  } finally {
    for (const id of ids) {
      for (const t of ['categories','wallets','transactions','debts','vaults','sessions','accounts'])
        await db.execute(`DELETE FROM ${t} WHERE userId=?`, [id]).catch(() => {})
      await db.execute('DELETE FROM users WHERE id=?', [id])
    }
    await db.end()
    fs.rmSync(jarA, { force: true }); fs.rmSync(jarB, { force: true })
    console.log('cleanup done')
  }
  process.exit(fail === 0 ? 0 : 1)
})()
