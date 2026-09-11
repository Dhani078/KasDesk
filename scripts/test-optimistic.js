/**
 * Optimistic transaction test (FR-LOG-6/11) — structural.
 *
 * The optimistic row appears in the feed BEFORE the server round-trip
 * (FR-LOG-6), and rolls back on failure (FR-LOG-11). The real interaction is
 * browser-only (context + hydration), so this asserts the wiring:
 *   A. pending-tx.tsx exposes addPending/resolvePending and a provider
 *   B. QuickLogSheet adds the pending row before await createTransaction
 *      and resolves it after success/failure
 *   C. HomeFeed renders pending rows (and marks failed ones)
 *   D. AppShell wraps the app in the provider
 *
 * Run: node scripts/test-optimistic.js
 */
const fs = require('fs')
const path = require('path')

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}
const has = (s, needle) => s.includes(needle)

const ctx = fs.readFileSync(path.join(__dirname, '..', 'components', 'pending-tx.tsx'), 'utf8')
const sheet = fs.readFileSync(path.join(__dirname, '..', 'components', 'QuickLogSheet.tsx'), 'utf8')
const feed = fs.readFileSync(path.join(__dirname, '..', 'components', 'HomeFeed.tsx'), 'utf8')
const shell = fs.readFileSync(path.join(__dirname, '..', 'components', 'AppShell.tsx'), 'utf8')

console.log('=== A. PendingTxProvider contract ===')
check('provider exposes addPending', has(ctx, 'addPending'))
check('provider exposes resolvePending', has(ctx, 'resolvePending'))
check('rows get a unique clientId', has(ctx, 'crypto.randomUUID()'))
check('failure marks the row failed (rollback path ready)',
  has(ctx, 'failed: true') && has(ctx, 'setTimeout'))
check('provider defaults categoryTag', has(ctx, 'categoryTag: tx.categoryTag ??'))

console.log('\n=== B. QuickLogSheet wires optimistic ===')
check('sheet consumes the hook', has(sheet, 'usePendingTx()'))
check('addPending is called BEFORE the server action',
  /\n\s*const clientId = addPending\([\s\S]{0,260}?const res = await createTransaction\(/.test(sheet))
check('pending resolves after success', has(sheet, 'resolvePending(clientId, true)'))
check('pending rolls back on failure', has(sheet, 'resolvePending(clientId, false)'))

console.log('\n=== C. HomeFeed renders pending rows ===')
check('feed reads pending from context', has(feed, 'usePendingTx()'))
check('feed renders a pending row', has(feed, 'isPending'))
check('failed pending rows are visually muted', has(feed, 'opacity-50') && has(feed, '— gagal'))
check('pending rows sort on top', has(feed, '...pendingRows.map'))

console.log('\n=== D. Provider wraps the app ===')
check('AppShell wraps children in PendingTxProvider',
  has(shell, '<PendingTxProvider>'))

console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
process.exit(fail ? 1 : 0)