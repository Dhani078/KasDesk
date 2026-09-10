/**
 * Unit test for the archived-wallet guard.
 *
 * `createTransaction` calls `requireUserId()`, which needs a Next request
 * scope, so it cannot be exercised from plain Node. The archived-wallet rule
 * is therefore extracted into `isArchivedWallet()` and tested here directly.
 *
 * The point of the guard: archived wallets are excluded from Total Saldo, so
 * spending from one makes money vanish with no visible cause. `getWallets()`
 * already hides them from the UI; this is the second layer in case a crafted
 * request or a future UI bug reaches the action.
 *
 * Run: npx tsx scripts/test-archived-unit.ts
 */
import { isArchivedWallet } from '../lib/wallet-guard'

let pass = 0
let fail = 0
const check = (n: string, c: boolean, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

console.log('=== isArchivedWallet(): archived wallets must be detected ===')

// The shapes MySQL / the driver may actually hand back for a tinyint column.
check('archived: 1 (number) is archived', isArchivedWallet({ isArchived: 1 }) === true)
check('archived: true (boolean) is archived', isArchivedWallet({ isArchived: true }) === true)
check('archived: Buffer<1> is archived', isArchivedWallet({ isArchived: Buffer.from([1]) }) === true)
check('archived: "1" (string) is archived', isArchivedWallet({ isArchived: '1' }) === true)

// Active wallets must NOT be blocked — over-blocking would break normal use.
check('active: 0 (number) is NOT archived', isArchivedWallet({ isArchived: 0 }) === false)
check('active: false is NOT archived', isArchivedWallet({ isArchived: false }) === false)
check('active: Buffer<0> is NOT archived', isArchivedWallet({ isArchived: Buffer.from([0]) }) === false)
check('active: "0" (string) is NOT archived', isArchivedWallet({ isArchived: '0' }) === false)

// Defensive: a missing/odd row must not be treated as archived, otherwise a
// NULL column would silently block every transaction.
check('missing key is NOT archived', isArchivedWallet({}) === false)
check('null value is NOT archived', isArchivedWallet({ isArchived: null }) === false)
check('undefined value is NOT archived', isArchivedWallet({ isArchived: undefined }) === false)
check('null row is NOT archived', isArchivedWallet(null) === false)

console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
process.exit(fail ? 1 : 0)
