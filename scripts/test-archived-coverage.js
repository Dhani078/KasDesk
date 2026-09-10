/**
 * Guard-coverage test: is the archived-wallet rule applied on EVERY path that
 * moves money?
 *
 * A guard on createTransaction alone is not enough. Money also moves through
 * depositToVault (out of a wallet) and withdrawFromVault (into a wallet), and
 * an archived destination is just as lossy as an archived source — the balance
 * rises while Total Saldo stays flat, so the money still vanishes.
 *
 * These actions cannot be called from plain Node (requireUserId() needs a Next
 * request scope), so this test asserts the PRESENCE AND PLACEMENT of the guard
 * by parsing the source: every wallet lookup that precedes a balance mutation
 * must select isArchived and then call isArchivedWallet().
 *
 * This is a structural test, so it is deliberately strict — a future refactor
 * that moves a mutation but forgets the guard should fail here.
 *
 * Run: node scripts/test-archived-coverage.js
 */
const fs = require('fs')
const path = require('path')

let pass = 0
let fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'actions.ts'), 'utf8')

/** Extract the body of `export async function <name>(`. */
function fnBody(name) {
  const start = src.indexOf(`export async function ${name}(`)
  if (start < 0) return ''
  const next = src.indexOf('\nexport async function ', start + 10)
  return src.slice(start, next > 0 ? next : start + 4000)
}

// Functions that CREATE a money movement must refuse archived wallets.
const MUTATORS = ['createTransaction', 'depositToVault', 'withdrawFromVault']

// deleteTransaction also moves money, but it is a REVERSAL, and reversal must
// always succeed: if we refused, a user who archived a wallet could never
// delete its old transactions and the balance would be frozen forever.
// Assert the exemption explicitly so a future "consistency" refactor that adds
// the guard here has to update this test and think about the consequence.
const EXEMPT = ['deleteTransaction']

console.log('=== Archived-wallet guard must cover every money-moving path ===')

for (const fn of MUTATORS) {
  const body = fnBody(fn)
  check(`${fn}: function exists`, body.length > 0)
  if (!body) continue

  const mutates = /wallets\.balance\}\)|\.set\(\{ balance/.test(body)
  check(`${fn}: mutates a wallet balance`, mutates)
  if (!mutates) continue

  // The lookup must actually fetch the flag...
  check(`${fn}: wallet lookup selects isArchived`,
    /isArchived: wallets\.isArchived/.test(body),
    'select is missing isArchived')

  // ...and must act on it.
  check(`${fn}: calls isArchivedWallet() guard`,
    /isArchivedWallet\(/.test(body),
    'no isArchivedWallet() call found')

  // ...and the thrown error must be translated for the user.
  check(`${fn}: WALLET_ARCHIVED translated to a message`,
    /msg === 'WALLET_ARCHIVED'/.test(body),
    'error handler does not translate WALLET_ARCHIVED')
}

console.log('')

for (const fn of EXEMPT) {
  const body = fnBody(fn)
  check(`${fn}: exists and mutates a balance`,
    body.length > 0 && /wallets\.balance\}\)|\.set\(\{ balance/.test(body))

  // It MUST NOT guard: blocking a reversal strands money.
  check(`${fn}: does NOT call the archived guard (reversal must always work)`,
    !/isArchivedWallet\(/.test(body),
    'guard present — this would strand money in archived wallets')

  // The reason must be recorded, or the exemption looks like an oversight.
  check(`${fn}: exemption documented in source`,
    /deliberately NOT blocked|REVERSES an existing transaction/.test(body),
    'add a comment explaining why this path is exempt')
}

// The helper itself must live outside actions.ts (which is 'use server' and
// requires every export to be async).
check('helper lives in lib/wallet-guard.ts (not actions.ts)',
  fs.existsSync(path.join(__dirname, '..', 'lib', 'wallet-guard.ts')))
check('actions.ts does not define isArchivedWallet inline',
  !/export function isArchivedWallet/.test(src),
  'inline export would break the build ("Server Actions must be async")')

console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
process.exit(fail ? 1 : 0)
