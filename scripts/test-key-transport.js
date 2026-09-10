/**
 * API-key transport test.
 *
 * The Gemini key used to travel in the URL query string (`?key=...`). That is
 * a leak vector that never shows up in application logs: query strings end up
 * in proxy logs, CDN logs, and any error message that echoes the request URL.
 * It is now sent as the `x-goog-api-key` header.
 *
 * Two assertions:
 *   1. Structural — the route must not build a URL containing the key, and
 *      must send it as a header.
 *   2. Behavioural — a wrong key must be rejected differently from a valid
 *      one. Without this control the test would pass against an endpoint that
 *      ignores the key entirely.
 *
 * Requires GEMINI_API_KEY. Skips (does not silently pass) when it is absent.
 * Only status codes are printed; the key is never echoed.
 *
 * Run: node scripts/test-key-transport.js
 */
const fs = require('fs')
const path = require('path')

const env = {}
for (const raw of fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = raw.trim().match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const ROUTE = path.join(__dirname, '..', 'app', 'api', 'scan-receipt', 'route.ts')
const src = fs.readFileSync(ROUTE, 'utf8')

async function main() {
  console.log('=== The Gemini key must not travel in the URL ===')

  // ---- 1. Structural ----
  check('route does not interpolate the key into a URL',
    !/\?key=\$\{/.test(src) && !/key=\$\{apiKey\}/.test(src),
    'found ?key=${...} in the route')
  check('route sends the key as x-goog-api-key header',
    /x-goog-api-key/.test(src))
  check('fetch is called with the bare endpoint (no query string)',
    /fetch\(GEMINI_ENDPOINT,\s*\{/.test(src),
    'fetch URL still carries a query string')
  check('the key is never logged',
    !/console\.\w+\([^\n]*apiKey/.test(src))

  // ---- 2. Behavioural, with a control ----
  const key = env.GEMINI_API_KEY
  if (!key) {
    console.log('\n--- SKIPPED: no GEMINI_API_KEY in .env.local, so the live')
    console.log('    transport check cannot run. Structural checks above')
    console.log('    still applied. ---')
    console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed (partial)\n${'='.repeat(46)}`)
    process.exit(fail ? 1 : 0)
  }

  const URL_ = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
  const body = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'say ok' }] }] })

  async function status(headers, url) {
    try {
      const r = await fetch(url, { method: 'POST', headers, body })
      return r.status
    } catch {
      return -1
    }
  }

  // A valid key may answer 200, 400 or 429 (quota) — anything except an auth
  // rejection. An INVALID key must be refused.
  const good = await status({ 'Content-Type': 'application/json', 'x-goog-api-key': key }, URL_)
  const bad = await status({ 'Content-Type': 'application/json', 'x-goog-api-key': 'AIzaSyINVALID_CONTROL_000000' }, URL_)

  console.log(`  (valid key via header -> ${good}; invalid key -> ${bad})`)
  check('valid key via header is accepted (not 400/401/403)',
    good !== 400 && good !== 401 && good !== 403 && good !== -1, `got ${good}`)
  check('invalid key IS rejected (control works)',
    bad === 400 || bad === 401 || bad === 403, `got ${bad}`)
  check('valid and invalid keys get DIFFERENT answers',
    good !== bad, 'identical answers — the check cannot distinguish anything')

  console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error('ERROR:', e && e.stack ? e.stack : e)
  process.exit(1)
})
