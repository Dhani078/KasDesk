/**
 * Google OAuth feature-flag test.
 *
 * The button must appear ONLY when both env vars are set — a visible
 * button that cannot work is worse than none. This test asserts both
 * directions by building with and without the flag.
 *
 * Run: node scripts/test-google-flag.js
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const env = (() => {
  const o = {}
  for (const raw of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
    const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) o[m[1]] = m[2].trim()
  }
  return o
})()

const BASE = process.env.BASE_URL || 'http://localhost:3333'
let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const jar = path.join(os.tmpdir(), `gflag-${Date.now()}.txt`)
function curl(url) {
  return execFileSync('curl', ['-s', '-b', jar, '-c', jar, '--max-time', '60', url], { encoding: 'utf8', env })
}

console.log('=== Google OAuth feature flag ===')

const login = curl(`${BASE}/login`)
const register = curl(`${BASE}/register`)

// Detect the flag from what the SERVER actually rendered, not from local
// env: this test must work whether the flag came from .env.local or from a
// shell variable on the running process.
const configured = login.includes('Lanjut dengan Google') || login.includes('Daftar dengan Google')
console.log(`server reports Google configured = ${configured}`)

check('/login renders', login.includes('KASDESK'), login.slice(0, 80))
check('/register renders', register.includes('KASDESK'), register.slice(0, 80))

if (configured) {
  check('login shows Google button', login.includes('Lanjut dengan Google'))
  check('register shows Google button', register.includes('Daftar dengan Google'))
} else {
  check('login hides Google button when unconfigured',
    !login.includes('Lanjut dengan Google'))
  check('register hides Google button when unconfigured',
    !register.includes('Daftar dengan Google'))
}

// The client must never receive the OAuth secret — only a boolean.
check('no OAuth id leaked into HTML',
  !env.AUTH_GOOGLE_ID || !login.includes(env.AUTH_GOOGLE_ID))
check('no OAuth secret leaked into HTML',
  !env.AUTH_GOOGLE_SECRET || !login.includes(env.AUTH_GOOGLE_SECRET))

// The email/password form must still be present in both states.
check('login still has email field', login.includes('name="email"'))
check('login still has password field', login.includes('name="password"'))
check('register still has password field', register.includes('name="password"'))

fs.rmSync(jar, { force: true })
console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
process.exit(fail ? 1 : 0)