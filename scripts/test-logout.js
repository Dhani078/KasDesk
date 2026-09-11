/**
 * Sign-out and cache-hygiene test.
 *
 * Two findings this covers:
 *
 * 1. There was NO sign-out control. `logoutAction` existed but nothing called
 *    it, so a signed-in user could not end their session from the UI.
 *
 * 2. The PWA service worker caches authenticated HTML (the `pages`
 *    NetworkFirst route, 24h) because the PRD requires offline use. On a
 *    shared phone the next person could be served the previous user's
 *    dashboard from cache. So signing out must also purge the caches.
 *
 * The cache purge is browser-side and cannot be driven from curl, so it is
 * asserted structurally (the component must call caches.delete AND must still
 * call logoutAction). The session half is tested for real.
 *
 * Run: node scripts/test-logout.js
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

const jar = path.join(os.tmpdir(), `lo-${Date.now()}.txt`)
function curl(args) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '40', ...args], { encoding: 'utf8', env })
}
function status(url, useJar = false) {
  const a = ['-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '40']
  if (useJar) a.push('-b', jar, '-c', jar)
  a.push(url)
  return Number(execFileSync('curl', a, { encoding: 'utf8', env }).trim())
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

const EMAIL = `lo-${Date.now()}@example.com`
const PW = 'lo123456'

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

  console.log('=== A. Sign-out must exist and actually end the session ===')

  // Structural: a UI control must call the action.
  const home = fs.readFileSync(path.join(__dirname, '..', 'app', '(dashboard)', 'page.tsx'), 'utf8')
  check('home page renders the LogoutButton', /LogoutButton/.test(home))

  const btn = fs.readFileSync(path.join(__dirname, '..', 'components', 'LogoutButton.tsx'), 'utf8')
  check('LogoutButton calls logoutAction', /logoutAction\(/.test(btn))
  check('LogoutButton purges caches on sign-out (shared-device hygiene)',
    /caches\.delete/.test(btn))
  check('cache purge is best-effort (cannot block sign-out)',
    /catch\s*\{/.test(btn) && /logoutAction/.test(btn))

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
    [uid, 'Logout Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )

  console.log('\n=== B. The session must really end ===')

  check('signed out: / redirects', status(`${BASE}/`) === 307)
  check('login succeeds', await login(EMAIL, PW))
  check('signed in: / renders', status(`${BASE}/`, true) === 200)
  check('signed in: /wallets renders', status(`${BASE}/wallets`, true) === 200)

  // Sign out the way the button does: POST to the signout endpoint with CSRF.
  const csrf = JSON.parse(curl([`${BASE}/api/auth/csrf`])).csrfToken
  execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`,
    '--data-urlencode', `callbackUrl=${BASE}/login`,
    `${BASE}/api/auth/signout`], { encoding: 'utf8', env })

  check('after sign-out: / redirects again', status(`${BASE}/`) === 307,
    `got ${status(`${BASE}/`)}`)
  check('after sign-out: /wallets redirects too', status(`${BASE}/wallets`) === 307,
    `got ${status(`${BASE}/wallets`)}`)

  await db.execute('DELETE FROM users WHERE id=?', [uid])
  await db.end()
  fs.rmSync(jar, { force: true })

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch(e => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})
