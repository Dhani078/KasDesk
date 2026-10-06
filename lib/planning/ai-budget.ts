import { CATEGORY_ENUM } from '@/lib/schemas'

export interface CategorySpending {
  category: string
  spent: number
}

export interface BudgetRecommendation {
  category: (typeof CATEGORY_ENUM)[number]
  recommendedLimit: number
  reason: string
}

/**
 * Calculates smart AI budget recommendation using 50/30/20 rule
 * tailored to actual historical spending and monthly income.
 */
export function generateAiBudgetRecommendations(params: {
  monthlyIncome: number
  categorySpendings: CategorySpending[]
}): BudgetRecommendation[] {
  const { monthlyIncome, categorySpendings } = params
  const spendMap = new Map(categorySpendings.map((c) => [c.category, c.spent]))

  // Baseline allocation pools based on income, or fallback to spend baseline if income is 0
  const baselinePool = monthlyIncome > 0 ? monthlyIncome : Math.max(3_000_000, categorySpendings.reduce((s, c) => s + c.spent, 0) * 1.2)

  const recommendations: BudgetRecommendation[] = [
    {
      category: 'MAKAN',
      recommendedLimit: Math.max(
        500_000,
        Math.round((spendMap.get('MAKAN') ? spendMap.get('MAKAN')! * 1.15 : baselinePool * 0.25) / 50_000) * 50_000,
      ),
      reason: 'Kebutuhan pokok pangan dialokasikan ~20-25% dari arus kas bulanan.',
    },
    {
      category: 'TRANSPORT',
      recommendedLimit: Math.max(
        200_000,
        Math.round((spendMap.get('TRANSPORT') ? spendMap.get('TRANSPORT')! * 1.15 : baselinePool * 0.10) / 25_000) * 25_000,
      ),
      reason: 'Mobilitas rutin & bahan bakar dialokasikan ~10% dari arus kas bulanan.',
    },
    {
      category: 'TAGIHAN',
      recommendedLimit: Math.max(
        250_000,
        Math.round((spendMap.get('TAGIHAN') ? spendMap.get('TAGIHAN')! * 1.10 : baselinePool * 0.12) / 25_000) * 25_000,
      ),
      reason: 'Listrik, air, pulsa & internet rutin dialokasikan ~10-12%.',
    },
    {
      category: 'BELANJA',
      recommendedLimit: Math.max(
        200_000,
        Math.round((spendMap.get('BELANJA') ? spendMap.get('BELANJA')! * 1.10 : baselinePool * 0.10) / 50_000) * 50_000,
      ),
      reason: 'Keperluan rumah tangga & perlengkapan pribadi dialokasikan ~10%.',
    },
    {
      category: 'HIBURAN',
      recommendedLimit: Math.max(
        150_000,
        Math.round((spendMap.get('HIBURAN') ? spendMap.get('HIBURAN')! * 0.90 : baselinePool * 0.08) / 25_000) * 25_000,
      ),
      reason: 'Rekreasi & self-reward dibatasi ~8% agar tidak overspend.',
    },
    {
      category: 'KESEHATAN',
      recommendedLimit: Math.max(
        100_000,
        Math.round((spendMap.get('KESEHATAN') ? spendMap.get('KESEHATAN')! * 1.10 : baselinePool * 0.05) / 25_000) * 25_000,
      ),
      reason: 'Cadangan pos obat dan vitamin dialokasikan ~5%.',
    },
  ]

  return recommendations
}
