/**
 * Security headers test.
 *
 * The app had NO security headers at all: no nosniff, no framing protection,
 * no referrer policy. These are cheap wins that close real risks for a finance
 * app — clickjacking via a look-alike site, MIME-sniffed responses, and wallet
 * URLs leaking in the Referer header to third parties.
 *
 * Two halves, because "the header is present" and "the app still works" are
 * different claims and a bad header can satisfy the first while breaking the
 * second:
 *   A. every header is present with the right value
 *   B. normal pages still render (200) and login still succeeds
 *
 * Run: node scripts/test-security-headers.js
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

function headers(url) {
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '--max-time', '25', url],
    { encoding: 'utf8', env })
  const map = {}
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z-]+):\s*(.*)$/)
    if (m) map[m[1].toLowerCase()] = m[2].trim()
  }
  return map
}
function status(url, useJar = false) {
  const args = ['-s', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '25']
  // Authenticated checks MUST send the session cookie, or the app correctly
  // redirects a signed-out request and the assertion fails for the wrong reason.
  if (useJar) args.push('-b', jar, '-c', jar)
  args.push(url)
  return Number(execFileSync('curl', args, { encoding: 'utf8', env }).trim())
}

const jar = path.join(os.tmpdir(), `sec-${Date.now()}.txt`)
async function login(email, pw) {
  const csrf = JSON.parse(execFileSync('curl', ['-s', '-b', jar, '-c', jar,
    `${BASE}/api/auth/csrf`], { encoding: 'utf8', env })).csrfToken
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL', '-b', jar, '-c', jar,
    '-X', 'POST', '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`, '--data-urlencode', `email=${email}`,
    '--data-urlencode', `password=${pw}`, '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`], { encoding: 'utf8', env })
  return /authjs\.session-token=/.test(out)
}

const EMAIL = `sec-${Date.now()}@example.com`
const PW = 'sec12345'

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

  console.log('=== A. Security headers must be present ===')

  // Checked on a PUBLIC page so the assertion does not depend on auth.
  const h = headers(`${BASE}/login`)
  check('X-Content-Type-Options: nosniff',
    h['x-content-type-options'] === 'nosniff', `got "${h['x-content-type-options']}"`)
  check('X-Frame-Options: DENY (anti-clickjacking)',
    h['x-frame-options'] === 'DENY', `got "${h['x-frame-options']}"`)
  check('Referrer-Policy set',
    /strict-origin/.test(h['referrer-policy'] || ''), `got "${h['referrer-policy']}"`)
  check('Permissions-Policy disables unused APIs',
    /microphone=\(\)/.test(h['permissions-policy'] || ''), `got "${h['permissions-policy']}"`)
  check('CSP is report-only (not enforcing yet)',
    Boolean(h['content-security-policy-report-only']))
  check('CSP declares frame-ancestors none',
    /frame-ancestors 'none'/.test(h['content-security-policy-report-only'] || ''))
  check('no enforcing CSP that could break the app',
    !h['content-security-policy'], 'an enforcing CSP appeared without being validated')

  // Headers must apply to API routes, not just pages.
  const api = headers(`${BASE}/api/auth/csrf`)
  check('headers also applied to API routes',
    api['x-content-type-options'] === 'nosniff', `got "${api['x-content-type-options']}"`)

  // ---- B. The app must still work ----
  console.log('\n=== B. The app must still function with these headers ===')

  check('/login renders (200)', status(`${BASE}/login`) === 200)
  check('/register renders (200)', status(`${BASE}/register`) === 200)
  check('/ redirects when signed out (307)', status(`${BASE}/`) === 307)
  check('/api/auth/csrf answers (200)', status(`${BASE}/api/auth/csrf`) === 200)

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
    [uid, 'Sec Tester', EMAIL, await bcrypt.hash(PW, 12)]
  )

  check('login still succeeds with headers in place', await login(EMAIL, PW))
  check('authenticated home renders (200)', status(`${BASE}/`, true) === 200,
    `got ${status(`${BASE}/`, true)}`)

  // And the same URL must still redirect when signed OUT — proving the 200
  // above came from the session, not from / having become public.
  const freshJar = path.join(os.tmpdir(), `anonal-${Date.now()}.txt`)
  const anon = Number(execFileSync('curl', ['-s', '-o', 'NUL', '-w', '%{http_code}',
    '--max-time', '25', `${BASE}/`], { encoding: 'utf8', env }).trim())
  fs.rmSync(freshJar, { force: true })
  check('signed-out / still redirects (307) — auth is not bypassed', anon === 307,
    `got ${anon}`)
  const authed = execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '25', `${BASE}/wallets`],
    { encoding: 'utf8', env })
  check('authenticated /wallets renders content', authed.length > 500, `len=${authed.length}`)

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
