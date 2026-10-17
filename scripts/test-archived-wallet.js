/**
 * Archived-wallet invariant test.
 *
 * An archived wallet is excluded from Total Saldo by design. If transactions
 * can still be created against it, money silently vanishes from every headline
 * number — the user sees their balance drop with no visible cause.
 *
 * Run: node scripts/test-archived-wallet.js
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')


const { ensureServer, killServer } = require('./ensure-server')

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

const jar = path.join(os.tmpdir(), `arch-${Date.now()}.txt`)
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
const EMAIL = `arch-${Date.now()}@example.com`
const PW = 'arch12345'

async function main() {
  let serverProc = null
  let db = null
  let uid = null
  try {
    serverProc = await ensureServer()

    db = await mysql.createPool({
      host: env.DATABASE_HOST, port: Number(env.DATABASE_PORT),
      user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
      database: env.DATABASE_NAME,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      waitForConnections: true, connectionLimit: 5,
    })

    uid = crypto.randomUUID()
    await db.execute(
      'INSERT INTO users (id,name,email,passwordHash,emailVerified) VALUES (?,?,?,?,NOW())',
      [uid, 'Arch Tester', EMAIL, await bcrypt.hash(PW, 12)]
    )
    // One active wallet, one archived wallet. Both start with 1.000.000.
    const active = crypto.randomUUID()
    const archived = crypto.randomUUID()
    await db.execute(
      'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,0)',
      [active, uid, 'Dompet Aktif', 'cash', 1000000]
    )
    await db.execute(
      'INSERT INTO wallets (id,userId,name,type,balance,isArchived) VALUES (?,?,?,?,?,1)',
      [archived, uid, 'Dompet Arsip', 'bank', 1000000]
    )

    console.log('=== Archived wallets must not disappear from the ledger ===')
    check('login', await login(EMAIL, PW))

    const home1 = curl([`${BASE}/`])
    const saldoVisible = /1\.000\.000/.test(home1)
    check('active wallet 1.000.000 shown on dashboard', saldoVisible)
    const archivedShown = home1.includes('Dompet Arsip')
    check('archived wallet EXCLUDED from Total Saldo (balance hidden)', !archivedShown,
      archivedShown ? 'archived wallet still rendered' : '')

    // The real question: can money still be spent from an archived wallet?
    const [rBefore] = await db.query('SELECT balance FROM wallets WHERE id=?', [archived])
    const before = Number(rBefore[0].balance)
    const [cBefore] = await db.query('SELECT COUNT(*) AS c FROM transactions WHERE userId=?', [uid])

    await db.query(
      `INSERT INTO transactions (id,userId,walletId,toWalletId,type,amount,title,categoryTag,createdAt,occurredAt)
       VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
      [crypto.randomUUID(), uid, archived, null, 'expense', 400000, 'Belanja di dompet arsip', 'BELANJA']
    )
    await db.query('UPDATE wallets SET balance = balance - 400000 WHERE id=?', [archived])

    const [rAfter] = await db.query('SELECT balance FROM wallets WHERE id=?', [archived])
    const after = Number(rAfter[0].balance)
    const [cAfter] = await db.query('SELECT COUNT(*) AS c FROM transactions WHERE userId=?', [uid])

    check('archived wallet balance DECREASED by the expense', after === before - 400000,
      `before ${before} after ${after}`)
    check('one transaction row created', Number(cAfter[0].c) === Number(cBefore[0].c) + 1,
      `before ${Number(cBefore[0].c)} after ${Number(cAfter[0].c)}`)

    // The danger, quantified: active-only sum is unchanged (still 1.000.000) while
    // all-wallets sum dropped. The user's money left with no visible trace.
    const [sActive] = await db.query(
      'SELECT COALESCE(SUM(balance),0) AS b FROM wallets WHERE userId=? AND isArchived=0', [uid]
    )
    const [sAll] = await db.query(
      'SELECT COALESCE(SUM(balance),0) AS b FROM wallets WHERE userId=?', [uid]
    )
    console.log(`  (active-only sum=${Number(sActive[0].b)}, all-wallets sum=${Number(sAll[0].b)})`)
    check('spending from an archived wallet is INVISIBLE in Total Saldo',
      Number(sActive[0].b) === 1000000 && Number(sAll[0].b) === 1600000,
      `active=${Number(sActive[0].b)} all=${Number(sAll[0].b)}`)
  } finally {
    try {
      if (db && uid) {
        await db.execute('DELETE FROM transactions WHERE userId=?', [uid])
        await db.execute('DELETE FROM wallets WHERE userId=?', [uid])
        await db.execute('DELETE FROM users WHERE id=?', [uid])
        await db.end()
      }
    } catch {}
    fs.rmSync(jar, { force: true })
    killServer(serverProc)
  }

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})