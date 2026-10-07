/**
 * KasDesk Micro-Savings & Spare-Change Round-Up Engine (EPIC 5)
 *
 * Implements:
 * 1. Spare-Change Round-Up ("Celengan Pembulatan"):
 *    Rounds expenses up to the nearest Rp 1.000, Rp 5.000, or Rp 10.000
 *    and sweeps the difference directly into a designated Vault.
 * 2. "Pay Yourself First" Rules:
 *    Auto-suggests 10%-20% savings allocations for large incomes (>= Rp 1.000.000).
 */

export type RoundUpStep = 1000 | 5000 | 10000

export type RoundUpResult = { roundedTotal: number; spareChange: number }

export type PayYourselfFirstResult = {
  isEligible: boolean
  recommendedAmount: number
  percentage: number
}

export type RoundUpConfig = {
  enabled: boolean
  step: RoundUpStep
  targetVaultId: string | null
}

export const DEFAULT_ROUNDUP_CONFIG: RoundUpConfig = {
  enabled: false,
  step: 5000,
  targetVaultId: null,
}

export const ROUNDUP_STORAGE_KEY = 'kasdesk:micro-savings-config'

/**
 * Calculates spare change round-up for a given expense amount.
 *
 * @example
 * calculateRoundUp(22000, 5000)
 * // => { roundedTotal: 25000, spareChange: 3000 }
 *
 * calculateRoundUp(25000, 5000)
 * // => { roundedTotal: 25000, spareChange: 0 }
 *
 * calculateRoundUp(18500, 1000)
 * // => { roundedTotal: 19000, spareChange: 500 }
 */
export function calculateRoundUp(
  amount: number,
  step: number
): { roundedTotal: number; spareChange: number } {
  const amt = Math.trunc(amount)
  const stp = Math.trunc(step)

  if (amt <= 0 || stp <= 0) {
    return { roundedTotal: Math.max(0, amt), spareChange: 0 }
  }

  const remainder = amt % stp
  if (remainder === 0) {
    return { roundedTotal: amt, spareChange: 0 }
  }

  const spareChange = stp - remainder
  const roundedTotal = amt + spareChange

  return { roundedTotal, spareChange }
}

/**
 * Calculates "Pay Yourself First" allocation recommendation for income events.
 * Triggered when income >= 1.000.000 IDR.
 */
export function calculatePayYourselfFirst(
  incomeAmount: number,
  percentage: number = 15
): {
  isEligible: boolean
  recommendedAmount: number
  percentage: number
} {
  const amt = Math.trunc(incomeAmount)
  const pct = Math.max(1, Math.min(100, Math.trunc(percentage)))

  if (amt < 1_000_000) {
    return {
      isEligible: false,
      recommendedAmount: 0,
      percentage: pct,
    }
  }

  const recommendedAmount = Math.round((amt * pct) / 100)
  return {
    isEligible: true,
    recommendedAmount,
    percentage: pct,
  }
}

/**
 * Client-side loader for round-up configuration from localStorage.
 */
export function getLocalRoundUpConfig(): RoundUpConfig {
  if (typeof window === 'undefined') return DEFAULT_ROUNDUP_CONFIG
  try {
    const raw = localStorage.getItem(ROUNDUP_STORAGE_KEY)
    if (!raw) return DEFAULT_ROUNDUP_CONFIG
    const parsed = JSON.parse(raw) as Partial<RoundUpConfig>
    const step = (parsed.step === 1000 || parsed.step === 5000 || parsed.step === 10000)
      ? parsed.step
      : 5000
    return {
      enabled: Boolean(parsed.enabled),
      step,
      targetVaultId: parsed.targetVaultId || null,
    }
  } catch {
    return DEFAULT_ROUNDUP_CONFIG
  }
}

/**
 * Client-side saver for round-up configuration to localStorage.
 */
export function saveLocalRoundUpConfig(config: RoundUpConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ROUNDUP_STORAGE_KEY, JSON.stringify(config))
    // Broadcast event across components
    window.dispatchEvent(new CustomEvent('kasdesk:roundup-config-change', { detail: config }))
  } catch {}
}
