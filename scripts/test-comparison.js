/**
 * Test Month-over-Month Variance & Comparison Engine.
 * Run: node scripts/test-comparison.js
 */
const fs = require('fs')
const path = require('path')

let pass = 0, fail = 0
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  PASS  ${n}`) }
  else { fail++; console.log(`  FAIL  ${n} ${d ? '-> ' + d : ''}`) }
}

console.log('=== Month-over-Month Comparison Engine Unit Tests ===')

const { computeMonthComparison } = require('../lib/analytics/comparison.ts')
const actionsSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'analytics', 'actions.ts'), 'utf8')
const componentSrc = fs.readFileSync(path.join(__dirname, '..', 'components', 'insights', 'MonthComparisonCard.tsx'), 'utf8')
const insightsSrc = fs.readFileSync(path.join(__dirname, '..', 'app', '(dashboard)', 'insights', 'page.tsx'), 'utf8')

// 1. Contract & Architecture Checks
check('actions.ts exports getMonthComparison', /export async function getMonthComparison\(/.test(actionsSrc))
check('MonthComparisonCard component exists', /export function MonthComparisonCard\(/.test(componentSrc))
check('insights page renders MonthComparisonCard', /<MonthComparisonCard\s+data=\{comparison\}\s*\/>/.test(insightsSrc))

// 2. Pure Math: Zero and Identical spending
{
  const r = computeMonthComparison([], [])
  check('empty months -> currentTotal=0, previousTotal=0', r.currentTotal === 0 && r.previousTotal === 0)
  check('empty months -> diffAmount=0', r.diffAmount === 0)
  check('empty months -> diffPercentage=0', r.diffPercentage === 0)
  check('empty months -> trend=same', r.trend === 'same')
  check('empty months -> biggestSpike=null', r.biggestSpike === null)
  check('empty months -> biggestSaving=null', r.biggestSaving === null)
}

// 3. Identical spending
{
  const curr = [{ category: 'MAKAN', amount: 500_000 }]
  const prev = [{ category: 'MAKAN', amount: 500_000 }]
  const r = computeMonthComparison(curr, prev)
  check('identical spending -> diff=0, trend=same', r.diffAmount === 0 && r.trend === 'same' && r.diffPercentage === 0)
}

// 4. Spending Increase (Inflation / Spike)
{
  const curr = [
    { category: 'MAKAN', amount: 1_200_000 },
    { category: 'TRANSPORT', amount: 300_000 },
  ]
  const prev = [
    { category: 'MAKAN', amount: 800_000 },
    { category: 'TRANSPORT', amount: 200_000 },
  ]
  const r = computeMonthComparison(curr, prev)
  check('spending increase -> currentTotal=1.5M', r.currentTotal === 1_500_000)
  check('spending increase -> previousTotal=1.0M', r.previousTotal === 1_000_000)
  check('spending increase -> diffAmount=+500k', r.diffAmount === 500_000)
  check('spending increase -> diffPercentage=+50%', r.diffPercentage === 50)
  check('spending increase -> trend=up', r.trend === 'up')
  check('biggestSpike is MAKAN (+400k)', r.biggestSpike?.category === 'MAKAN' && r.biggestSpike?.amount === 400_000)
}

// 5. Spending Decrease (Savings)
{
  const curr = [
    { category: 'MAKAN', amount: 600_000 },
    { category: 'BELANJA', amount: 200_000 },
  ]
  const prev = [
    { category: 'MAKAN', amount: 600_000 },
    { category: 'BELANJA', amount: 400_000 },
  ]
  const r = computeMonthComparison(curr, prev)
  check('spending decrease -> diffAmount=-200k', r.diffAmount === -200_000)
  check('spending decrease -> diffPercentage=-20%', r.diffPercentage === -20)
  check('spending decrease -> trend=down', r.trend === 'down')
  check('biggestSaving is BELANJA (200k)', r.biggestSaving?.category === 'BELANJA' && r.biggestSaving?.amount === 200_000)
}

// 6. New Category and Discontinued Category
{
  const curr = [
    { category: 'KURSUS', amount: 300_000 }, // New
  ]
  const prev = [
    { category: 'LIBURAN', amount: 500_000 }, // Discontinued
  ]
  const r = computeMonthComparison(curr, prev)
  check('categories count is 2', r.categories.length === 2)
  const kursus = r.categories.find(c => c.category === 'KURSUS')
  const liburan = r.categories.find(c => c.category === 'LIBURAN')
  check('new category KURSUS diff=+300k, trend=up', kursus?.diffAmount === 300_000 && kursus?.trend === 'up')
  check('discontinued category LIBURAN diff=-500k, trend=down', liburan?.diffAmount === -500_000 && liburan?.trend === 'down')
  check('discontinued category LIBURAN diffPercentage=-100%', liburan?.diffPercentage === -100)
}

console.log('\n==============================================')
console.log(`RESULT: ${pass} passed, ${fail} failed`)
console.log('==============================================')
process.exit(fail ? 1 : 0)
