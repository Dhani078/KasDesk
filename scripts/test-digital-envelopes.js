/**
 * Tests for Digital Envelopes & Zero-Based Budgeting Engine (EPIC 5.1).
 *
 * Verifies:
 * - 50/30/20 standard income partitioning.
 * - Zero-Based Budgeting constraint: totalAllocated === monthlyIncome (unassigned === 0).
 * - Tag aggregation across Needs, Wants, and Savings.
 * - Overspent envelope identification and negative remaining balance detection.
 * - Custom envelope allocation override.
 */
import { calculateDigitalEnvelopes } from "../lib/planning/digital-envelopes.ts";

let passCount = 0
function t(name, ok) {
  if (ok) {
    console.log(`  PASS  ${name}`)
    passCount++
  } else {
    console.error(`  FAIL  ${name}`)
    process.exit(1)
  }
}

console.log('=== Digital Envelopes & Zero-Based Budgeting Tests (EPIC 5.1) ===')

// 1. Zero income test
const zero = calculateDigitalEnvelopes(0, {})
t('zero income has 0 unassigned', zero.unassignedAmount === 0)
t('zero income totalAllocated is 0', zero.totalAllocated === 0)
t('zero income is not marked as perfect ZBB', zero.isPerfectZBB === false)

// 2. 10.000.000 IDR baseline allocation (50/30/20)
const base = calculateDigitalEnvelopes(10000000, {
  MAKAN: 2000000,
  TRANSPORT: 1000000,
  BELANJA: 1500000,
  TABUNGAN: 1000000,
})

t('total allocated matches 10M income', base.totalAllocated === 10000000)
t('unassigned is exactly 0', base.unassignedAmount === 0)
t('marked as perfect ZBB', base.isPerfectZBB === true)

const needs = base.envelopes.find((e) => e.id === 'needs')
const wants = base.envelopes.find((e) => e.id === 'wants')
const savings = base.envelopes.find((e) => e.id === 'savings')

t('needs allocated is 5.000.000 (50%)', needs.allocatedAmount === 5000000)
t('wants allocated is 3.000.000 (30%)', wants.allocatedAmount === 3000000)
t('savings allocated is 2.000.000 (20%)', savings.allocatedAmount === 2000000)

t('needs spent is 3.000.000 (MAKAN + TRANSPORT)', needs.spentAmount === 3000000)
t('needs remaining is 2.000.000', needs.remainingAmount === 2000000)
t('needs burn rate is 60%', needs.burnRatePercentage === 60)
t('needs is not overspent', needs.isOverspent === false)

t('wants spent is 1.500.000 (BELANJA)', wants.spentAmount === 1500000)
t('wants remaining is 1.500.000', wants.remainingAmount === 1500000)

// 3. Overspent scenario
const overspent = calculateDigitalEnvelopes(10000000, {
  BELANJA: 3500000, // exceeds 3M wants budget
})
const overWants = overspent.envelopes.find((e) => e.id === 'wants')
t('wants remaining is -500.000', overWants.remainingAmount === -500000)
t('wants is marked as overspent', overWants.isOverspent === true)
t('wants burn rate is > 100%', overWants.burnRatePercentage === 117)

// 4. Custom allocation override
const custom = calculateDigitalEnvelopes(10000000, {}, {
  needs: 6000000,
  wants: 2000000,
  savings: 2000000,
})
t('custom needs is 6.000.000', custom.envelopes.find((e) => e.id === 'needs').allocatedAmount === 6000000)
t('custom total allocated matches 10M', custom.totalAllocated === 10000000)
t('custom is perfect ZBB', custom.isPerfectZBB === true)

console.log('\n==============================================')
console.log(`RESULT: ${passCount} passed, 0 failed`)
console.log('==============================================')
