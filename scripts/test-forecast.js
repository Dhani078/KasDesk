/**
 * Test Cashflow Forecast Simulation Engine (PRD v2.0 §3.3).
 * Run: node scripts/test-forecast.js
 */
const { simulateCashflowForecast } = require('../lib/analytics/forecast')

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

console.log('=== Predictive Cashflow Forecast Simulation Tests ===')

const start = new Date(2026, 9, 1, 12, 0, 0) // Oct 1, 2026

// 1. Pure linear burn rate (1M start, 50k/day burn)
const r1 = simulateCashflowForecast({
  currentBalance: 1_000_000,
  dailyBurnRate: 50_000,
  projectionDays: 30,
  criticalThreshold: 500_000,
  startDate: start,
})

check('points length is days + 1 (baseline day 0 included)', r1.points.length === 31)
check('day 0 balance matches initial balance', r1.points[0].balance === 1_000_000)
check('day 10 balance drops to 500k', r1.points[10].balance === 500_000)
check('critical date triggered at day 10', r1.daysUntilCritical === 10)
check('critical date formatted correctly', r1.criticalDate === '2026-10-11')
check('overdraft triggered around day 20', r1.willOverdraft === true && r1.lowestBalance < 0)

// 2. Payday Spike: Salary arrives at Day 5
const payday = new Date(2026, 9, 6, 12, 0, 0) // Oct 6 (Day 5 from Oct 1)
const r2 = simulateCashflowForecast({
  currentBalance: 300_000, // Starts tight
  dailyBurnRate: 30_000,
  projectionDays: 30,
  criticalThreshold: 200_000,
  recurringRules: [
    {
      title: 'Gaji Kantor',
      type: 'income',
      amount: 5_000_000,
      frequency: 'monthly',
      nextRunAt: payday,
      isActive: 1,
    },
  ],
  startDate: start,
})

check('total scheduled income recorded', r2.totalScheduledIncome === 5_000_000)
check('day 5 reflects salary spike', r2.points[5].balance > 4_500_000)
check('lowest balance does not overdraft due to payday', r2.willOverdraft === false)

// 3. What-if shock scenario (purchase laptop on Day 3)
const rShock = simulateCashflowForecast({
  currentBalance: 10_000_000,
  dailyBurnRate: 50_000,
  projectionDays: 30,
  oneTimeShockAmount: 8_000_000,
  oneTimeShockDay: 3,
  startDate: start,
})

check('shock drops balance sharply on shock day', rShock.points[3].balance < 2_000_000)
check('shock day scheduled outflow reflects shock amount', rShock.points[3].scheduledOutflow >= 8_000_000)

// 4. Sequential dates invariant
let dateOrderValid = true
for (let i = 1; i < r1.points.length; i++) {
  if (r1.points[i].date <= r1.points[i - 1].date) {
    dateOrderValid = false
    break
  }
}
check('simulation dates are strictly monotonic and sequential', dateOrderValid)

console.log(`\n==============================================\nRESULT: ${pass} passed, ${fail} failed\n==============================================`)
process.exit(fail ? 1 : 0)
