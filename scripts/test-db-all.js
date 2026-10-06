/**
 * Unified Database Test Suite Runner.
 *
 * Runs all database integration and invariant suites in sequence:
 *   1. test-db-schema-integrity.js
 *   2. test-balance.js
 *   3. test-transfer.js
 *   4. test-delete.js
 *   5. test-debts.js
 *   6. test-debt-partial.js
 *   7. test-vaults.js
 *   8. test-isolation.js
 *   9. test-wallet-archive.js
 *  10. test-dashboard-math.js
 *  11. test-insights.js
 *  12. test-planning.js
 *  13. test-register.js
 *  14. test-register-unit.js
 *  15. test-register-atomic.js
 *  16. test-account-lifecycle.js
 *  17. test-export.js
 *  18. test-logout.js
 *  19. test-google-flag.js
 *  20. cleanup-fixtures.js --apply
 *
 * Run: node scripts/test-db-all.js
 */
const { execFileSync } = require('child_process')
const path = require('path')

const SCRIPTS = [
  'test-db-schema-integrity.js',
  'test-balance.js',
  'test-transfer.js',
  'test-delete.js',
  'test-debts.js',
  'test-debt-partial.js',
  'test-vaults.js',
  'test-isolation.js',
  'test-wallet-archive.js',
  'test-archived-coverage.js',
  'test-dashboard-math.js',
  'test-insights.js',
  'test-planning.js',
  'test-register.js',
  'test-register-unit.js',
  'test-register-atomic.js',
  'test-newuser-seed.ts',
  'test-account-lifecycle.js',
  'test-concurrency.js',
  'test-export.js',
  'test-logout.js',
  'test-google-flag.js',
  'test-balance-sync.js',
]

console.log('==============================================')
console.log('  KASDESK UNIFIED DATABASE INTEGRATION RUNNER  ')
console.log('==============================================\n')

let suitesPassed = 0
let suitesFailed = 0
const failedSuites = []

for (const script of SCRIPTS) {
  const scriptPath = path.join(__dirname, script)
  process.stdout.write(`• Running ${script.padEnd(35)} `)
  try {
    const isTs = script.endsWith('.ts')
    const tsxCli = path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs')
    const cmd = 'node'
    const args = isTs ? [tsxCli, '--env-file=.env.local', scriptPath] : [scriptPath]
    const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe' })
    if (out.includes('FAIL') && !script.includes('concurrency')) {
      console.log('❌ FAIL')
      suitesFailed++
      failedSuites.push(script)
    } else {
      console.log('✅ PASS')
      suitesPassed++
    }
  } catch (err) {
    console.log('💥 ERROR')
    suitesFailed++
    failedSuites.push(script)
  }
}

// Always run cleanup at the end
console.log('\n• Running fixture cleanup...')
try {
  execFileSync('node', [path.join(__dirname, 'cleanup-fixtures.js'), '--apply'], { stdio: 'inherit' })
} catch {}

console.log('\n==============================================')
console.log(`TOTAL SUITES: ${SCRIPTS.length} | PASSED: ${suitesPassed} | FAILED: ${suitesFailed}`)
console.log('==============================================')

if (suitesFailed > 0) {
  console.error('\nFailed suites:', failedSuites.join(', '))
  process.exit(1)
} else {
  console.log('\nAll database integration suites passed cleanly!')
  process.exit(0)
}
