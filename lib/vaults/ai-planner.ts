export interface VaultFeasibilityResult {
  isFeasible: boolean
  targetAmount: number
  targetMonths: number
  monthlyRequired: number
  weeklyRequired: number
  surplusMonthly: number
  feasibilityScore: number // 0 - 100
  verdict: 'SANGAT_REALISTIS' | 'CUKUP_REALISTIS' | 'KETAT' | 'TIDAK_REALISTIS'
  suggestion: string
}

export function evaluateVaultFeasibility(params: {
  targetAmount: number
  targetMonths: number
  monthlyIncome: number
  monthlyExpense: number
  upcomingDebts?: number
}): VaultFeasibilityResult {
  const { targetAmount, targetMonths, monthlyIncome, monthlyExpense, upcomingDebts = 0 } = params

  const safeMonths = Math.max(1, Math.min(120, Math.trunc(targetMonths)))
  const safeTarget = Math.max(100_000, Math.trunc(targetAmount))

  // Monthly required saving
  const monthlyRequired = Math.ceil(safeTarget / safeMonths)
  const weeklyRequired = Math.ceil(monthlyRequired / 4)

  // Current free cash flow surplus
  const monthlyBurn = monthlyExpense > 0 ? monthlyExpense : monthlyIncome * 0.7
  const grossSurplus = Math.max(0, monthlyIncome - monthlyBurn - upcomingDebts)
  const netSurplus = monthlyIncome > 0 ? grossSurplus : Math.max(500_000, monthlyRequired * 1.1)

  // Feasibility Ratio
  const ratio = netSurplus > 0 ? monthlyRequired / netSurplus : 2.5
  let feasibilityScore = Math.max(10, Math.min(100, Math.round((1 / (ratio || 1)) * 90)))
  if (monthlyIncome === 0) feasibilityScore = 75 // Neutral estimation if income not tracked yet

  let verdict: VaultFeasibilityResult['verdict'] = 'CUKUP_REALISTIS'
  let suggestion = ''

  if (ratio <= 0.6) {
    verdict = 'SANGAT_REALISTIS'
    feasibilityScore = Math.min(100, feasibilityScore)
    suggestion = `Target sangat aman! Alokasi bulanan hanya menyerap sebagian kecil dari surplus kasmu (${Math.round(ratio * 100)}%).`
  } else if (ratio <= 1.0) {
    verdict = 'CUKUP_REALISTIS'
    suggestion = `Bisa tercapai dengan disiplin. Dibutuhkan komitmen setoran ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(monthlyRequired)}/bulan dari sisa uang bulanan.`
  } else if (ratio <= 1.5) {
    verdict = 'KETAT'
    suggestion = `Cukup ketat karena target bulanan melebihi surplus saat ini. Disarankan perpanjang durasi target menjadi ${Math.ceil(safeTarget / Math.max(1, netSurplus))} bulan atau pangkas pengeluaran non-primer.`
  } else {
    verdict = 'TIDAK_REALISTIS'
    suggestion = `Defisit arus kas. Target membutuhkan ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(monthlyRequired)}/bulan sedangkan surplus saat ini terbatas. Perpanjang tenor atau turunkan nominal target.`
  }

  return {
    isFeasible: ratio <= 1.0,
    targetAmount: safeTarget,
    targetMonths: safeMonths,
    monthlyRequired,
    weeklyRequired,
    surplusMonthly: netSurplus,
    feasibilityScore,
    verdict,
    suggestion,
  }
}
