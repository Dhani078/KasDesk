/**
 * Indonesian Personal Income Tax (PPh 21) Calculator for Freelancers & Independent Workers
 * using the Deemed Profit Rate / Norma Penghitungan Penghasilan Neto (NPPN) scheme
 * based on UU HPP (Harmonisasi Peraturan Perpajakan) and PER-17/PJ/2015.
 */

export const PTKP_RATES: Record<string, { label: string; amount: number }> = {
  'TK/0': { label: 'Tidak Kawin / Tanpa Tanggungan (TK/0)', amount: 54_000_000 },
  'K/0': { label: 'Kawin / Tanpa Tanggungan (K/0)', amount: 58_500_000 },
  'K/1': { label: 'Kawin / 1 Tanggungan (K/1)', amount: 63_000_000 },
  'K/2': { label: 'Kawin / 2 Tanggungan (K/2)', amount: 67_500_000 },
  'K/3': { label: 'Kawin / 3 Tanggungan (K/3)', amount: 72_000_000 },
}

export type PtkpCode = keyof typeof PTKP_RATES

export interface TaxCalculationResult {
  grossAnnual: number
  normaPercent: number
  netIncome: number
  ptkpCode: PtkpCode
  ptkpAmount: number
  taxableIncome: number
  bracketBreakdown: { bracket: string; rate: number; taxableAmount: number; taxAmount: number }[]
  annualTax: number
  monthlyReserve: number
  effectiveRatePercent: number
}

/**
 * Calculate progressive personal tax under Pasal 17 UU HPP:
 * 1. Up to Rp 60M: 5%
 * 2. > Rp 60M up to Rp 250M: 15%
 * 3. > Rp 250M up to Rp 500M: 25%
 * 4. > Rp 500M up to Rp 5B: 30%
 * 5. > Rp 5B: 35%
 */
export function calculateFreelancerTax(
  grossAnnual: number,
  normaPercent: number = 50,
  ptkpCode: PtkpCode = 'TK/0',
): TaxCalculationResult {
  const safeGross = Math.max(0, Math.trunc(grossAnnual))
  const safeNorma = Math.min(100, Math.max(0, normaPercent))
  const ptkp = PTKP_RATES[ptkpCode] ?? PTKP_RATES['TK/0']

  const netIncome = Math.floor(safeGross * (safeNorma / 100))
  const taxableIncome = Math.max(0, netIncome - ptkp.amount)

  let remainingTaxable = taxableIncome
  let annualTax = 0
  const breakdown: TaxCalculationResult['bracketBreakdown'] = []

  const tiers = [
    { label: '0 – 60 Juta', cap: 60_000_000, rate: 0.05 },
    { label: '60 – 250 Juta', cap: 190_000_000, rate: 0.15 },
    { label: '250 – 500 Juta', cap: 250_000_000, rate: 0.25 },
    { label: '500 Juta – 5 Miliar', cap: 4_500_000_000, rate: 0.30 },
    { label: '> 5 Miliar', cap: Infinity, rate: 0.35 },
  ]

  for (const tier of tiers) {
    if (remainingTaxable <= 0) break
    const chunk = Math.min(remainingTaxable, tier.cap)
    const tax = Math.round(chunk * tier.rate)
    breakdown.push({
      bracket: tier.label,
      rate: Math.round(tier.rate * 100),
      taxableAmount: chunk,
      taxAmount: tax,
    })
    annualTax += tax
    remainingTaxable -= chunk
  }

  const monthlyReserve = Math.round(annualTax / 12)
  const effectiveRatePercent = safeGross > 0 ? Number(((annualTax / safeGross) * 100).toFixed(2)) : 0

  return {
    grossAnnual: safeGross,
    normaPercent: safeNorma,
    netIncome,
    ptkpCode,
    ptkpAmount: ptkp.amount,
    taxableIncome,
    bracketBreakdown: breakdown,
    annualTax,
    monthlyReserve,
    effectiveRatePercent,
  }
}
