/**
 * Test Due Recurring Bills & 1-Tap Execution Widget.
 * Run: node scripts/test-due-bills.js
 */
const fs = require('fs')
const path = require('path')

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

console.log('=== Due Recurring Bills & Home Widget Unit Tests ===')

const planningActionsSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'planning', 'actions.ts'), 'utf8')
const dueBillsCardSrc = fs.readFileSync(path.join(__dirname, '..', 'components', 'planning', 'DueBillsCard.tsx'), 'utf8')
const homePageSrc = fs.readFileSync(path.join(__dirname, '..', 'app', '(dashboard)', 'page.tsx'), 'utf8')
const dailyFocusSrc = fs.readFileSync(path.join(__dirname, '..', 'components', 'DailyFocus.tsx'), 'utf8')

// 1. Contract & Exports
check('lib/planning/actions exports getDueRecurringRules', /export async function getDueRecurringRules\(/.test(planningActionsSrc))
check('getDueRecurringRules checks isActive = 1', /eq\(recurringRules\.isActive,\s*1\)/.test(planningActionsSrc))
check('getDueRecurringRules checks lte nextRunAt now', /lte\(recurringRules\.nextRunAt,\s*now\)/.test(planningActionsSrc))
check('getDueRecurringRules orders by ascending nextRunAt', /asc\(recurringRules\.nextRunAt\)/.test(planningActionsSrc))

// 2. DueBillsCard Component Architecture
check('DueBillsCard handles empty rules cleanly (returns null)', /if\s*\(!rules\s*\|\|\s*rules\.length\s*===\s*0\)\s*return\s*null/.test(dueBillsCardSrc))
check('DueBillsCard imports executeRecurringAction', /executeRecurringAction/.test(dueBillsCardSrc))
check('DueBillsCard includes wallet selection for multiple wallets', /name="walletId"/.test(dueBillsCardSrc) && /<select/.test(dueBillsCardSrc))
check('DueBillsCard provides 1-tap submit button', /type="submit"/.test(dueBillsCardSrc) && /Catat/.test(dueBillsCardSrc))
check('DueBillsCard displays badge with rule frequency', /rule\.frequency\s*===\s*'weekly'/.test(dueBillsCardSrc))
check('DueBillsCard uses accessible section label', /aria-label="Tagihan jatuh tempo"/.test(dueBillsCardSrc))

// 3. Home Dashboard Integration
check('HomePage fetches getDueRecurringRules in Promise.all', /getDueRecurringRules\(\)/.test(homePageSrc))
check('HomePage renders DueBillsCard with rules and wallets', /<DueBillsCard\s+rules=\{dueRecurring\}\s+wallets=\{wallets\}\s*\/>/.test(homePageSrc))
check('HomePage passes dueBillsCount to DailyFocus', /dueBillsCount:\s*dueRecurring\.length/.test(homePageSrc))

// 4. DailyFocus Proactive Alert
check('DailyFocus type includes dueBillsCount', /dueBillsCount\?:\s*number/.test(dailyFocusSrc))
check('DailyFocus pickFocus prioritizes due bills when present', /dash\.dueBillsCount\s*>\s*0/.test(dailyFocusSrc))
check('DailyFocus displays warning status pill for due bills', /tagihan tempo/.test(dailyFocusSrc))

// 5. Logic Filter Simulation
const now = new Date('2026-10-11T12:00:00.000Z')
const mockRules = [
  { id: '1', title: 'Listrik', nextRunAt: new Date('2026-10-10T00:00:00.000Z'), isActive: 1 }, // Past -> Due
  { id: '2', title: 'Internet', nextRunAt: new Date('2026-10-11T10:00:00.000Z'), isActive: 1 }, // Earlier today -> Due
  { id: '3', title: 'Air PAM', nextRunAt: new Date('2026-10-15T00:00:00.000Z'), isActive: 1 }, // Future -> Not due
  { id: '4', title: 'Gym', nextRunAt: new Date('2026-10-09T00:00:00.000Z'), isActive: 0 }, // Inactive -> Not due
]

const due = mockRules.filter((r) => r.isActive === 1 && r.nextRunAt.getTime() <= now.getTime())
check('simulation filters exactly 2 due bills', due.length === 2)
check('simulation includes overdue rule (Listrik)', due.some((r) => r.title === 'Listrik'))
check('simulation includes today rule (Internet)', due.some((r) => r.title === 'Internet'))
check('simulation excludes future rule (Air PAM)', !due.some((r) => r.title === 'Air PAM'))
check('simulation excludes inactive rule (Gym)', !due.some((r) => r.title === 'Gym'))

console.log('\n==============================================')
console.log(`RESULT: ${pass} passed, ${fail} failed`)
console.log('==============================================')
process.exit(fail ? 1 : 0)
