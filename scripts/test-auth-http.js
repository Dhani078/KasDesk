/**
 * End-to-end HTTP login test using curl (mirrors real browser cookie
 * behaviour). Node's fetch was not forwarding the CSRF cookie reliably,
 * while curl demonstrably completes the Auth.js credentials flow.
 *
 * Asserts: CSRF issued, login sets a session cookie, session resolves to
 * the right user, protected route opens with that session, and a wrong
 * password does NOT produce a session.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const BASE = process.env.BASE_URL || 'http://localhost:3333'
const JAR = path.join(os.tmpdir(), `kasdesk-jar-${Date.now()}.txt`)
const EMAIL = 'manual-test@example.com'
const PW = 'secret123'

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d}`) }
}

/** Run curl, return { status, headers } with headers dumped to stdout. */
function curl(args) {
  const out = execFileSync('curl', [
    '-s', '-D', '-', '-o', 'NUL',
    '-b', JAR, '-c', JAR, '--max-time', '60', ...args,
  ], { encoding: 'utf8' })
  const lines = out.split(/\r?\n/)
  const status = parseInt((lines.find((l) => /^HTTP\//.test(l)) || '').split(' ')[1] || '0', 10)
  const headers = {}
  for (const l of lines) {
    const m = l.match(/^([A-Za-z-]+):\s*(.*)$/)
    if (m) headers[m[1].toLowerCase()] = (headers[m[1].toLowerCase()] || '') + m[2] + ' || '
  }
  return { status, headers }
}

function getCsrf() {
  const out = execFileSync('curl', ['-s', '-b', JAR, '-c', JAR,
    '--max-time', '60', `${BASE}/api/auth/csrf`], { encoding: 'utf8' })
  return JSON.parse(out).csrfToken
}

try {
  console.log('\n=== 1. PROTECTED ROUTE WITHOUT SESSION ===')
  const r0 = curl([`${BASE}/`])
  check('/ redirects when unauthenticated (307)', r0.status === 307, `got ${r0.status}`)
  check('redirect points to /login', /\/login/.test(r0.headers.location || ''),
    r0.headers.location)

  console.log('\n=== 2. LOGIN WITH CORRECT PASSWORD ===')
  const csrf = getCsrf()
  check('csrf token obtained', !!csrf)
  const r1 = curl(['-X', 'POST',
    '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`,
    '--data-urlencode', `email=${EMAIL}`,
    '--data-urlencode', `password=${PW}`,
    '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`])
  const cookies = r1.headers['set-cookie'] || ''
  check('login returns redirect (302)', r1.status === 302, `got ${r1.status}`)
  check('authjs.session-token cookie issued',
    /authjs\.session-token=/.test(cookies), cookies.slice(0, 90))
  check('redirect has no error param',
    !/error=/.test(r1.headers.location || ''), r1.headers.location)

  console.log('\n=== 3. SESSION RESOLVES TO THE RIGHT USER ===')
  const sessOut = execFileSync('curl', ['-s', '-b', JAR, '-c', JAR,
    '--max-time', '60', `${BASE}/api/auth/session`], { encoding: 'utf8' })
  const sess = JSON.parse(sessOut)
  check('session returns a user', !!sess?.user, sessOut.slice(0, 90))
  check('session email matches', sess?.user?.email === EMAIL, sess?.user?.email)
  check('session exposes user id', !!sess?.user?.id, String(sess?.user?.id))

  console.log('\n=== 4. PROTECTED ROUTE OPENS WITH SESSION ===')
  const r2 = curl([`${BASE}/`])
  check('/ returns 200 with a valid session', r2.status === 200, `got ${r2.status}`)

  console.log('\n=== 5. WRONG PASSWORD GETS NO SESSION ===')
  fs.rmSync(JAR, { force: true })            // fresh jar: no prior session
  const csrf2 = getCsrf()
  const r3 = curl(['-X', 'POST',
    '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf2}`,
    '--data-urlencode', `email=${EMAIL}`,
    '--data-urlencode', 'password=definitely-wrong',
    '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`])
  const badCookies = r3.headers['set-cookie'] || ''
  check('wrong password does not issue session cookie',
    !/authjs\.session-token=/.test(badCookies), badCookies.slice(0, 90))
  check('wrong password redirects with CredentialsSignin error',
    /error=CredentialsSignin/.test(r3.headers.location || ''), r3.headers.location)

  console.log(`\n${'='.repeat(46)}`)
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  console.log('='.repeat(46))
} catch (e) {
  console.error('ERROR:', e.message)
  fail++
} finally {
  fs.rmSync(JAR, { force: true })
}
process.exit(fail === 0 ? 0 : 1)
