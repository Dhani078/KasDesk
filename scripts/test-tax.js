/**
 * Test Indonesian Freelancer Tax Calculation (PPh 21 Norma NPPN UU HPP).
 * Run: node scripts/test-tax.js
 */
const { calculateFreelancerTax } = require('../lib/tax')

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

console.log('=== Indonesian Freelancer PPh 21 Norma NPPN Tests ===')

// 1. Zero income
const r0 = calculateFreelancerTax(0, 50, 'TK/0')
check('zero gross yields 0 tax', r0.annualTax === 0 && r0.monthlyReserve === 0)

// 2. Gross below PTKP
const rBelow = calculateFreelancerTax(80_000_000, 50, 'TK/0') // Net 40M < PTKP 54M
check('income below PTKP yields 0 tax', rBelow.taxableIncome === 0 && rBelow.annualTax === 0)

// 3. Gross 120M, 50% Norma, TK/0
// Net = 60M, PTKP = 54M, PKP = 6M. Tax 5% * 6M = 300,000.
const r120 = calculateFreelancerTax(120_000_000, 50, 'TK/0')
check('120M gross: net income is 60M', r120.netIncome === 60_000_000)
check('120M gross: PKP is 6M', r120.taxableIncome === 6_000_000)
check('120M gross: annual tax is 300.000', r120.annualTax === 300_000, `got ${r120.annualTax}`)
check('120M gross: monthly reserve is 25.000', r120.monthlyReserve === 25_000)

// 4. Gross 300M, 50% Norma, TK/0
// Net = 150M, PTKP = 54M, PKP = 96M.
// Bracket 1: 60M * 5% = 3,000,000
// Bracket 2: 36M * 15% = 5,400,000
// Total = 8,400,000. Monthly = 700,000.
const r300 = calculateFreelancerTax(300_000_000, 50, 'TK/0')
check('300M gross: PKP is 96M', r300.taxableIncome === 96_000_000)
check('300M gross: annual tax is 8.400.000', r300.annualTax === 8_400_000, `got ${r300.annualTax}`)
check('300M gross: monthly reserve is 700.000', r300.monthlyReserve === 700_000)
check('300M gross: 2 brackets populated', r300.bracketBreakdown.length === 2)

// 5. Dependent check: K/1 (63M PTKP)
const rK1 = calculateFreelancerTax(150_000_000, 50, 'K/1') // Net 75M - 63M = 12M PKP -> 5% * 12M = 600,000
check('K/1 deduction applies 63M PTKP', rK1.ptkpAmount === 63_000_000 && rK1.annualTax === 600_000)

console.log(`\n==============================================\nRESULT: ${pass} passed, ${fail} failed\n==============================================`)
process.exit(fail ? 1 : 0)
