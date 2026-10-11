export interface CategorySpending {
  category: string
  amount: number
}

export interface CategoryDelta {
  category: string
  currentAmount: number
  previousAmount: number
  diffAmount: number
  diffPercentage: number
  trend: 'up' | 'down' | 'same'
}

export interface MonthComparisonResult {
  currentTotal: number
  previousTotal: number
  diffAmount: number
  diffPercentage: number
  trend: 'up' | 'down' | 'same'
  currentMonthName: string
  previousMonthName: string
  categories: CategoryDelta[]
  biggestSpike: { category: string; amount: number } | null
  biggestSaving: { category: string; amount: number } | null
}

export function computeMonthComparison(
  currentList: CategorySpending[],
  previousList: CategorySpending[],
  currentMonthName = 'Bulan Ini',
  previousMonthName = 'Bulan Lalu'
): MonthComparisonResult {
  const currentMap = new Map<string, number>()
  for (const item of currentList) {
    const val = Number(item.amount) || 0
    currentMap.set(item.category, (currentMap.get(item.category) ?? 0) + val)
  }

  const previousMap = new Map<string, number>()
  for (const item of previousList) {
    const val = Number(item.amount) || 0
    previousMap.set(item.category, (previousMap.get(item.category) ?? 0) + val)
  }

  const currentTotal = [...currentMap.values()].reduce((a, b) => a + b, 0)
  const previousTotal = [...previousMap.values()].reduce((a, b) => a + b, 0)
  const diffAmount = currentTotal - previousTotal

  let diffPercentage = 0
  if (previousTotal > 0) {
    diffPercentage = Math.round((diffAmount / previousTotal) * 100)
  } else if (currentTotal > 0) {
    diffPercentage = 100
  }

  const trend: 'up' | 'down' | 'same' =
    diffAmount > 0 ? 'up' : diffAmount < 0 ? 'down' : 'same'

  // Combine unique categories from both months
  const allCategories = new Set([...currentMap.keys(), ...previousMap.keys()])
  const categories: CategoryDelta[] = []

  let biggestSpike: { category: string; amount: number } | null = null
  let biggestSaving: { category: string; amount: number } | null = null

  for (const cat of allCategories) {
    const cur = currentMap.get(cat) ?? 0
    const prev = previousMap.get(cat) ?? 0
    const diff = cur - prev

    let pct = 0
    if (prev > 0) {
      pct = Math.round((diff / prev) * 100)
    } else if (cur > 0) {
      pct = 100
    }

    const cTrend: 'up' | 'down' | 'same' =
      diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'

    categories.push({
      category: cat,
      currentAmount: cur,
      previousAmount: prev,
      diffAmount: diff,
      diffPercentage: pct,
      trend: cTrend,
    })

    if (diff > 0) {
      if (!biggestSpike || diff > biggestSpike.amount) {
        biggestSpike = { category: cat, amount: diff }
      }
    } else if (diff < 0) {
      const saving = Math.abs(diff)
      if (!biggestSaving || saving > biggestSaving.amount) {
        biggestSaving = { category: cat, amount: saving }
      }
    }
  }

  // Sort by highest current amount, then biggest diff
  categories.sort((a, b) => b.currentAmount - a.currentAmount || Math.abs(b.diffAmount) - Math.abs(a.diffAmount))

  return {
    currentTotal,
    previousTotal,
    diffAmount,
    diffPercentage,
    trend,
    currentMonthName,
    previousMonthName,
    categories,
    biggestSpike,
    biggestSaving,
  }
}
