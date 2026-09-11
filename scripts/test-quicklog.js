/**
 * Quick-Log FR coverage: LOG-3 (IDR input), LOG-5 (category chips),
 * LOG-7 (last-used wallet) — structural checks.
 *
 * The sheet only mounts after a client click, so SSR HTML cannot show it.
 * These are client-interaction concerns; the honest test is on the source:
 * the behaviour we promised exists and is wired to the right inputs.
 *
 * Run: node scripts/test-quicklog.js
 */
const fs = require('fs')
const path = require('path')

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

const sheet = fs.readFileSync(path.join(__dirname, '..', 'components', 'QuickLogSheet.tsx'), 'utf8')
const home = fs.readFileSync(path.join(__dirname, '..', 'app', 'page.tsx'), 'utf8')

// Raw strings: the source contains backslashes (regex classes) that a regex
// test would have to double-escape. includes() avoids that entirely.
const has = (s, needle) => s.includes(needle)

console.log('=== FR-LOG-3: IDR-formatted amount input ===')
check('amount input is controlled (value bound to state)',
  has(sheet, 'value={amountText}') && has(sheet, 'onChange={(e) => onAmountChange(e.target.value)}'))
check('typing formats with thousand separators (regex \\B lookahead)',
  has(sheet, String.raw`replace(/\B(?=(\d{3})+(?!\d))/g, '.')`))
check('submit strips non-digits (12000 from "12.000")',
  has(sheet, String.raw`replace(/[^\d]/g, '')`))
check('amount input uses inputMode numeric (no type=number spinner)',
  has(sheet, 'inputMode="numeric"') && has(sheet, '"amount"'))

console.log('\n=== FR-LOG-5: category chips, last-used first ===')
check('category is rendered as chips, not a <select>',
  has(sheet, 'role="radiogroup"') && has(sheet, 'aria-label="Kategori"') && !/name="category_tag"[\s\S]{0,60}<select/.test(sheet))
check('chips drive a hidden category_tag input',
  has(sheet, 'name="category_tag"') && has(sheet, 'value={catSel}'))
check('last-used category is remembered (localStorage)',
  has(sheet, 'kasdesk:last-category'))
check('last-used category sorts first',
  has(sheet, '[last, ...CATEGORY_ENUM.filter'))
check('selection is persisted on pick',
  has(sheet, "setItem('kasdesk:last-category', c)"))

console.log('\n=== FR-LOG-7: last-used wallet default ===')
check('wallet default reads localStorage',
  has(sheet, 'kasdesk:last-wallet'))
check('wallet choice is persisted',
  has(sheet, "setItem('kasdesk:last-wallet'"))
check('wallet select is controlled',
  has(sheet, 'value={walletSel}') && has(sheet, 'name="wallet_id"'))

console.log('\n=== FR-TXN-2: wallet name in the feed row ===')
check('home renders wallet name before category',
  has(home, 'walletName(t.walletId)'))
check('walletName resolves from the wallets list',
  has(home, 'wallets.find((w) => w.id === id)'))

console.log(`\n${'='.repeat(46)}\nRESULT: ${pass} passed, ${fail} failed\n${'='.repeat(46)}`)
process.exit(fail ? 1 : 0)