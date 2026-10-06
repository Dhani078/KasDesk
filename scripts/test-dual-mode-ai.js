/**
 * Test Dual-Mode AI Copilots (Budget 50/30/20, Vault Feasibility, Debt Reminder Copilot).
 * Run: node scripts/test-dual-mode-ai.js
 */
const { generateAiBudgetRecommendations } = require('../lib/planning/ai-budget')
const { evaluateVaultFeasibility } = require('../lib/vaults/ai-planner')
const { generateDebtReminderMessage } = require('../lib/debts/ai-reminder')

let pass = 0
let fail = 0
const check = (name, cond, details = '') => {
  if (cond) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    console.log(`  FAIL  ${name} ${details ? '-> ' + details : ''}`)
  }
}

console.log('=== Dual-Mode AI Copilot Feature Tests ===')

// 1. AI Budget Recommender
const bRecs = generateAiBudgetRecommendations({
  monthlyIncome: 6_000_000,
  categorySpendings: [
    { category: 'MAKAN', spent: 1_200_000 },
    { category: 'TRANSPORT', spent: 400_000 },
    { category: 'TAGIHAN', spent: 500_000 },
  ],
})

check('budget recommendations length is 6', bRecs.length === 6)
const makanRec = bRecs.find((r) => r.category === 'MAKAN')
check('MAKAN budget recommendation > actual spent', makanRec && makanRec.recommendedLimit >= 1_200_000)
const hiburanRec = bRecs.find((r) => r.category === 'HIBURAN')
check('HIBURAN recommended limit is safe cap', hiburanRec && hiburanRec.recommendedLimit > 0)

// 2. AI Vault Planner & Feasibility
const vFeasible = evaluateVaultFeasibility({
  targetAmount: 5_000_000,
  targetMonths: 10,
  monthlyIncome: 7_000_000,
  monthlyExpense: 4_000_000,
})
check('vault feasible target marked feasible', vFeasible.isFeasible === true)
check('monthly required is 500k', vFeasible.monthlyRequired === 500_000)
check('weekly required is 125k', vFeasible.weeklyRequired === 125_000)
check('verdict is SANGAT_REALISTIS', vFeasible.verdict === 'SANGAT_REALISTIS')

const vTight = evaluateVaultFeasibility({
  targetAmount: 20_000_000,
  targetMonths: 2,
  monthlyIncome: 5_000_000,
  monthlyExpense: 4_500_000,
})
check('tight vault marked infeasible or tight', vTight.isFeasible === false)
check('tight vault verdict is TIDAK_REALISTIS or KETAT', vTight.verdict === 'TIDAK_REALISTIS')

// 3. AI Debt Reminder Generator
const msgSantun = generateDebtReminderMessage({
  personName: 'Rian',
  amount: 250_000,
  tone: 'santun',
})
check('santun message includes polite tone and amount', msgSantun.includes('Halo Rian') && msgSantun.includes('250.000'))

const msgSantai = generateDebtReminderMessage({
  personName: 'Bima',
  amount: 75_000,
  tone: 'santai',
  bankOrEwallet: 'BCA',
  accountNumber: '1234567890',
})
check('santai message includes bank details', msgSantai.includes('santai') && msgSantai.includes('1234567890'))

const msgTegas = generateDebtReminderMessage({
  personName: 'Deni',
  amount: 1_500_000,
  dueDate: '2026-10-10',
  tone: 'tegas',
})
check('tegas message includes due date', msgTegas.includes('jatuh tempo') && msgTegas.includes('1.500.000'))

console.log(`\n==============================================\nRESULT: ${pass} passed, ${fail} failed\n==============================================`)
process.exit(fail ? 1 : 0)
