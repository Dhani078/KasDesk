/**
 * Smoke test: logs in as the seeded demo user and asserts every screen
 * renders real data (not the old hard-coded mockup).
 *
 * Run:  node scripts/smoke-ui.js        (server must be up on BASE_URL)
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const BASE = process.env.BASE_URL || 'http://localhost:3333'
const JAR = path.join(os.tmpdir(), `kasdesk-smoke-${Date.now()}.txt`)
const EMAIL = 'demo@kasdesk.test'
const PW = 'demo12345'

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d}`) }
}

function curl(args) {
  const out = execFileSync('curl', ['-s', '-D', '-', '-o', 'NUL',
    '-b', JAR, '-c', JAR, '--max-time', '60', ...args], { encoding: 'utf8' })
  const lines = out.split(/\r?\n/)
  const status = parseInt((lines.find((l) => /^HTTP\//.test(l)) || '').split(' ')[1] || '0', 10)
  return { status, raw: out }
}
function body(url) {
  return execFileSync('curl', ['-s', '-b', JAR, '-c', JAR, '--max-time', '60', url],
    { encoding: 'utf8' })
}
function getCsrf() {
  return JSON.parse(body(`${BASE}/api/auth/csrf`)).csrfToken
}

try {
  console.log('\n=== LOGIN AS DEMO USER ===')
  const csrf = getCsrf()
  const r = curl(['-X', 'POST',
    '-H', 'Content-Type: application/x-www-form-urlencoded',
    '--data-urlencode', `csrfToken=${csrf}`,
    '--data-urlencode', `email=${EMAIL}`,
    '--data-urlencode', `password=${PW}`,
    '--data-urlencode', `callbackUrl=${BASE}/`,
    `${BASE}/api/auth/callback/credentials`])
  check('login succeeded (302)', r.status === 302, `got ${r.status}`)
  check('session cookie issued', /authjs\.session-token=/.test(r.raw))

  console.log('\n=== HOME / ===')
  const res = curl([`${BASE}/`])
  const home = body(`${BASE}/`)
  check('/ returns 200', res.status === 200, `got ${res.status}`)
  check('shows real total balance 9.020.000', home.includes('9.020.000'),
    home.includes('14.250.000') ? 'still the old mockup!' : 'balance not found')
  check('no longer shows mockup 14.250.000', !home.includes('14.250.000'))
  check('shows seeded transaction title', home.includes('Nasi Goreng Gila'))
  check('shows Safe Daily Spend ("Aman Harian")', home.includes('Aman Harian'))
  check('shows month summary', home.includes('Masuk') && home.includes('Keluar'))

  console.log('\n=== /wallets ===')
  const w = curl([`${BASE}/wallets`])
  const wtxt = body(`${BASE}/wallets`)
  check('/wallets returns 200 (was 404)', w.status === 200, `got ${w.status}`)
  check('lists seeded wallets', wtxt.includes('Tunai') && wtxt.includes('BCA') && wtxt.includes('GoPay'))
  check('shows wallet total', wtxt.includes('9.020.000'))

  console.log('\n=== /vaults ===')
  const v = curl([`${BASE}/vaults`])
  const vtxt = body(`${BASE}/vaults`)
  check('/vaults returns 200 (was 404)', v.status === 200, `got ${v.status}`)
  check('lists seeded vaults', vtxt.includes('Dana Darurat') && vtxt.includes('Laptop Baru'))

  console.log('\n=== /insights ===')
  const i = curl([`${BASE}/insights`])
  const itxt = body(`${BASE}/insights`)
  check('/insights returns 200 (was 404)', i.status === 200, `got ${i.status}`)
  check('shows 7-day flow section', itxt.includes('7 Hari Terakhir'))
  check('shows top categories', itxt.includes('Kategori Terbesar') && itxt.includes('MAKAN'))
  check('shows debts section', itxt.includes('Utang') && itxt.includes('Budi'))

  console.log('\n=== NAV ==')
  check('bottom nav present on home',
    home.includes('>Home<') && home.includes('>Dompet<') && home.includes('>Utang<'))
  check('bottom nav hidden on /login',
    !body(`${BASE}/login`).includes('>Home<'))

  console.log(`\n${'='.repeat(46)}`)
  console.log(`RESULT: ${pass} passed, ${fail} failed`)
  console.log('='.repeat(46))
} catch (e) {
  console.error('ERROR:', e.message); fail++
} finally {
  fs.rmSync(JAR, { force: true })
}
process.exit(fail === 0 ? 0 : 1)
