/**
 * Rate limiter unit test (threat T-01: credential brute force).
 *
 * Run: node scripts/test-ratelimit.js
 */
const fs = require('fs'), path = require('path')
const ts = require('typescript')

// Compile the TS module on the fly — it has no runtime deps.
const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'auth', 'rate-limit.ts'), 'utf8')
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText

const mod = { exports: {} }
new Function('exports', 'module', js)(mod.exports, mod)
const { checkRateLimit, clearRateLimit, _bucketSize } = mod.exports

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '→ ' + d : ''}`) }
}

console.log('\n=== 1. ALLOWS UP TO THE LIMIT ===')
for (let i = 1; i <= 8; i++) {
  const r = checkRateLimit('user-a@x.com')
  check(`attempt ${i} allowed`, r.ok === true)
}

console.log('\n=== 2. BLOCKS AFTER THE LIMIT ===')
const blocked = checkRateLimit('user-a@x.com')
check('attempt 9 blocked', blocked.ok === false)
check('reports retryAfterSec', blocked.ok === false && blocked.retryAfterSec > 0,
  JSON.stringify(blocked))

console.log('\n=== 3. DIFFERENT KEYS ARE INDEPENDENT ===')
check('user-b still allowed', checkRateLimit('user-b@x.com').ok === true)

console.log('\n=== 4. CLEAR RESETS THE BUCKET ===')
clearRateLimit('user-a@x.com')
check('user-a allowed again after clear', checkRateLimit('user-a@x.com').ok === true)

console.log('\n=== 5. UNBOUNDED GROWTH IS CAPPED ===')
for (let i = 0; i < 12000; i++) checkRateLimit(`flood-${i}@x.com`)
const size = _bucketSize()
check(`keys stay bounded (${size} <= 10000)`, size <= 10000, `got ${size}`)

console.log(`\n${'='.repeat(44)}`)
console.log(`RESULT: ${pass} passed, ${fail} failed`)
console.log('='.repeat(44))
process.exit(fail === 0 ? 0 : 1)
