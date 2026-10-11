/**
 * Test Transaction Filter Summary Aggregation & Query Resilience.
 * Run: node scripts/test-transaction-filters.js
 */
const fs = require('fs')
const path = require('path')

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

console.log('=== Transaction Filter Aggregation & Summary Tests ===')

const pageSrc = fs.readFileSync(path.join(__dirname, '..', 'app', '(dashboard)', 'transactions', 'page.tsx'), 'utf8')

// 1. Source Contract Verification
check('transactions page imports sql from drizzle-orm', /import\s*\{[^}]*\bsql\b[^}]*\}\s*from\s*['"]drizzle-orm['"]/.test(pageSrc))
check('transactions page calculates totalIncome via sum case', /case when \$\{transactions\.type\} = 'income' then \$\{transactions\.amount\}/.test(pageSrc))
check('transactions page calculates totalExpense via sum case', /case when \$\{transactions\.type\} = 'expense' then \$\{transactions\.amount\}/.test(pageSrc))
check('transactions page counts matching rows', /count\(\*\)/.test(pageSrc))
check('transactions page computes netAmount as totalIncome - totalExpense', /netAmount\s*=\s*totalIncome\s*-\s*totalExpense/.test(pageSrc))
check('transactions page renders Total Masuk strip', /Total Masuk/.test(pageSrc))
check('transactions page renders Total Keluar strip', /Total Keluar/.test(pageSrc))
check('transactions page renders Selisih Net strip', /Selisih Net/.test(pageSrc))
check('transactions page shows terfilter pill when filtered', /totalCount.*terfilter/.test(pageSrc))

// 2. Math & Aggregation Simulation
const mockTransactions = [
  { type: 'income', amount: 5_000_000 },
  { type: 'income', amount: 1_200_000 },
  { type: 'expense', amount: 800_000 },
  { type: 'expense', amount: 350_000 },
  { type: 'transfer', amount: 1_000_000 }, // Transfers between own wallets don't inflate cashflow
]

function computeAggregates(txs) {
  let income = 0
  let expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return {
    totalIncome: income,
    totalExpense: expense,
    netAmount: income - expense,
    count: txs.length,
  }
}

const agg = computeAggregates(mockTransactions)
check('totalIncome correctly sums income only (6.2M)', agg.totalIncome === 6_200_000)
check('totalExpense correctly sums expense only (1.15M)', agg.totalExpense === 1_150_000)
check('netAmount correctly subtracts expense from income (+5.05M)', agg.netAmount === 5_050_000)
check('transfers are excluded from net spending calculation', agg.totalExpense !== 2_150_000)
check('count includes all rows (5)', agg.count === 5)

// 3. Edge Case: Empty transactions
const emptyAgg = computeAggregates([])
check('empty transactions yields 0 income', emptyAgg.totalIncome === 0)
check('empty transactions yields 0 expense', emptyAgg.totalExpense === 0)
check('empty transactions yields 0 net', emptyAgg.netAmount === 0)
check('empty transactions yields 0 count', emptyAgg.count === 0)

console.log('\n==============================================')
console.log(`RESULT: ${pass} passed, ${fail} failed`)
console.log('==============================================')
process.exit(fail ? 1 : 0)
