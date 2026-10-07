/**
 * KasDesk Digital Envelopes Engine (EPIC 5.1 & ZBB 50/30/20)
 *
 * Implements Zero-Based Budgeting (ZBB):
 * - Needs (Kebutuhan Pokok - 50% target): #MAKAN, #TRANSPORT, #TAGIHAN, #KESEHATAN, #PENDIDIKAN
 * - Wants (Keinginan - 30% target): #BELANJA, #HIBURAN, #LAINNYA
 * - Savings & Debt (Tabungan/Utang - 20% target): #TABUNGAN, #INVESTASI, #CICILAN
 */

export type EnvelopeCategoryType = 'needs' | 'wants' | 'savings'

export type EnvelopeDefinition = {
  id: EnvelopeCategoryType
  title: string
  targetPercentage: number
  color: string
  tags: string[]
}

export const ENVELOPE_DEFINITIONS: Record<EnvelopeCategoryType, EnvelopeDefinition> = {
  needs: {
    id: 'needs',
    title: 'Kebutuhan Pokok (50%)',
    targetPercentage: 50,
    color: 'emerald',
    tags: ['MAKAN', 'TRANSPORT', 'TAGIHAN', 'KESEHATAN', 'PENDIDIKAN'],
  },
  wants: {
    id: 'wants',
    title: 'Keinginan & Gaya Hidup (30%)',
    targetPercentage: 30,
    color: 'indigo',
    tags: ['BELANJA', 'HIBURAN', 'LAINNYA'],
  },
  savings: {
    id: 'savings',
    title: 'Tabungan & Cicilan (20%)',
    targetPercentage: 20,
    color: 'amber',
    tags: ['TABUNGAN', 'INVESTASI', 'CICILAN'],
  },
}

export type CategorySpending = {
  tag: string
  spent: number
}

export type EnvelopeStatus = {
  id: EnvelopeCategoryType
  title: string
  targetPercentage: number
  allocatedAmount: number
  spentAmount: number
  remainingAmount: number
  burnRatePercentage: number
  isOverspent: boolean
}

export type ZeroBasedBudgetSummary = {
  monthlyIncome: number
  totalAllocated: number
  unassignedAmount: number
  isPerfectZBB: boolean
  envelopes: EnvelopeStatus[]
}

/**
 * Calculates Zero-Based Budgeting envelopes from monthly income and actual spending.
 */
export function calculateDigitalEnvelopes(
  monthlyIncome: number,
  spendingByTag: Record<string, number>,
  customAllocations?: Partial<Record<EnvelopeCategoryType, number>>
): ZeroBasedBudgetSummary {
  const income = Math.max(0, Math.trunc(monthlyIncome))

  // Default 50/30/20 proportions
  const defaultNeeds = Math.round((income * 50) / 100)
  const defaultWants = Math.round((income * 30) / 100)
  const defaultSavings = income - defaultNeeds - defaultWants

  const allocNeeds = customAllocations?.needs !== undefined ? customAllocations.needs : defaultNeeds
  const allocWants = customAllocations?.wants !== undefined ? customAllocations.wants : defaultWants
  const allocSavings = customAllocations?.savings !== undefined ? customAllocations.savings : defaultSavings

  const totalAllocated = allocNeeds + allocWants + allocSavings
  const unassignedAmount = income - totalAllocated
  const isPerfectZBB = income > 0 && unassignedAmount === 0

  function sumSpending(tags: string[]): number {
    return tags.reduce((acc, tag) => acc + (spendingByTag[tag] || 0), 0)
  }

  const spentNeeds = sumSpending(ENVELOPE_DEFINITIONS.needs.tags)
  const spentWants = sumSpending(ENVELOPE_DEFINITIONS.wants.tags)
  const spentSavings = sumSpending(ENVELOPE_DEFINITIONS.savings.tags)

  function buildStatus(
    id: EnvelopeCategoryType,
    allocated: number,
    spent: number
  ): EnvelopeStatus {
    const remaining = allocated - spent
    const burnRatePercentage = allocated > 0 ? Math.round((spent / allocated) * 100) : spent > 0 ? 100 : 0
    return {
      id,
      title: ENVELOPE_DEFINITIONS[id].title,
      targetPercentage: ENVELOPE_DEFINITIONS[id].targetPercentage,
      allocatedAmount: allocated,
      spentAmount: spent,
      remainingAmount: remaining,
      burnRatePercentage,
      isOverspent: remaining < 0,
    }
  }

  return {
    monthlyIncome: income,
    totalAllocated,
    unassignedAmount,
    isPerfectZBB,
    envelopes: [
      buildStatus('needs', allocNeeds, spentNeeds),
      buildStatus('wants', allocWants, spentWants),
      buildStatus('savings', allocSavings, spentSavings),
    ],
  }
}
