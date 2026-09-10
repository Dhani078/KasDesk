/**
 * Input-boundary test (schema level).
 *
 * The Zod schemas look strict — integer, positive, max 100 billion — but a
 * schema only protects the paths that actually run it. This exercises the REAL
 * TransactionSchema/WalletSchema/DebtSchema with hostile values.
 *
 * Why schema-level rather than HTTP: calling the server action needs its
 * build-generated action id, which changes every build. Faking that id makes
 * Next reject the request before validation runs, so every case "passes" for
 * the wrong reason — the balance never moves because nothing executed. That is
 * a false sense of security, so we test the validator itself instead.
 *
 * The dangerous cases are the ones that would CORRECT money if they slipped
 * through: a negative expense silently adds funds, a zero writes a junk row,
 * a fraction breaks the integer-money invariant.
 *
 * Run: npx tsx scripts/test-input-bounds.ts
 */
import { TransactionSchema, WalletSchema, DebtSchema } from '../lib/schemas'

let pass = 0
let fail = 0
const check = (n: string, c: boolean, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const WALLET = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

const base = {
  wallet_id: WALLET,
  type: 'expense' as const,
  amount: 1000,
  title: 'Belanja',
}

console.log('=== TransactionSchema must reject hostile input ===')

const BAD: [string, any][] = [
  ['negative amount (would ADD money on an expense)', { ...base, amount: -50000 }],
  ['zero amount (junk row)', { ...base, amount: 0 }],
  ['fractional amount (breaks integer money)', { ...base, amount: 10.5 }],
  ['over-max amount (100.000.000.001)', { ...base, amount: 100_000_000_001 }],
  ['NaN amount', { ...base, amount: Number.NaN }],
  ['Infinity amount', { ...base, amount: Number.POSITIVE_INFINITY }],
  ['string amount', { ...base, amount: '1000' }],
  ['empty title', { ...base, title: '' }],
  ['whitespace-only title', { ...base, title: '   ' }],
  ['over-long title (121 chars)', { ...base, title: 'x'.repeat(121) }],
  ['missing wallet', { ...base, wallet_id: '' }],
  ['bad type', { ...base, type: 'hack' }],
  ['transfer without destination', { ...base, type: 'transfer' }],
  ['transfer to the same wallet', { ...base, type: 'transfer', to_wallet_id: WALLET }],
]

for (const [label, payload] of BAD) {
  check(`rejects ${label}`, TransactionSchema.safeParse(payload).success === false)
}

console.log('\n=== ...while accepting valid input (no over-blocking) ===')

const GOOD: [string, any][] = [
  ['plain expense', base],
  ['max amount (100.000.000.000)', { ...base, amount: 100_000_000_000 }],
  ['income', { ...base, type: 'income' }],
  ['transfer to a different wallet', { ...base, type: 'transfer', to_wallet_id: OTHER }],
  ['title at the 120-char limit', { ...base, title: 'x'.repeat(120) }],
  ['with a category tag', { ...base, category_tag: 'MAKAN' }],
  ['with a note', { ...base, note: 'catatan' }],
]

for (const [label, payload] of GOOD) {
  const r = TransactionSchema.safeParse(payload)
  check(`accepts ${label}`, r.success === true, r.success ? '' : JSON.stringify(r.error.issues[0]))
}

console.log('\n=== WalletSchema / DebtSchema boundaries ===')

check('rejects wallet with empty name', WalletSchema.safeParse({ name: '', type: 'cash' }).success === false)
check('rejects wallet with bad type', WalletSchema.safeParse({ name: 'BCA', type: 'crypto' }).success === false)
check('rejects wallet with negative balance',
  WalletSchema.safeParse({ name: 'BCA', type: 'bank', balance: -1 }).success === false)
check('accepts a valid wallet', WalletSchema.safeParse({ name: 'BCA', type: 'bank', balance: 0 }).success === true)

const debtBase = { direction: 'utang' as const, person_name: 'Budi', amount: 50000 }
check('rejects debt with negative amount',
  DebtSchema.safeParse({ ...debtBase, amount: -1 }).success === false)
check('rejects debt with zero amount',
  DebtSchema.safeParse({ ...debtBase, amount: 0 }).success === false)
check('rejects debt with empty person',
  DebtSchema.safeParse({ ...debtBase, person_name: '' }).success === false)
check('accepts a valid debt', DebtSchema.safeParse(debtBase).success === true)

console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
process.exit(fail ? 1 : 0)
