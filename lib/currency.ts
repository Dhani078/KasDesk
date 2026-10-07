/**
 * KasDesk Multi-Currency, Forex, Emas & Crypto Engine (EPIC 1)
 *
 * Implements:
 * 1. Multi-Currency Wallets (IDR, USD, SGD, EUR, JPY, MYR, XAU, USDT, BTC, ETH)
 * 2. Adaptive Decimal Precision & Symbol Formatting
 * 3. Reference Exchange Rates against base currency (IDR)
 * 4. Consolidated Net Worth Rollup with Asset Class Breakdown
 */

export const SUPPORTED_CURRENCIES = [
  'IDR',
  'USD',
  'SGD',
  'EUR',
  'JPY',
  'MYR',
  'XAU',
  'USDT',
  'BTC',
  'ETH',
] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export type AssetClass = 'fiat' | 'commodity' | 'crypto'

export interface CurrencyMeta {
  code: SupportedCurrency
  name: string
  symbol: string
  decimals: number
  assetClass: AssetClass
  isBase?: boolean
}

export const CURRENCY_METAS: Record<SupportedCurrency, CurrencyMeta> = {
  IDR: { code: 'IDR', name: 'Rupiah Indonesia', symbol: 'Rp', decimals: 0, assetClass: 'fiat', isBase: true },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, assetClass: 'fiat' },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, assetClass: 'fiat' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, assetClass: 'fiat' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, assetClass: 'fiat' },
  MYR: { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, assetClass: 'fiat' },
  XAU: { code: 'XAU', name: 'Emas Antam (Gram)', symbol: 'gram', decimals: 3, assetClass: 'commodity' },
  USDT: { code: 'USDT', name: 'Tether USD', symbol: 'USDT', decimals: 2, assetClass: 'crypto' },
  BTC: { code: 'BTC', name: 'Bitcoin', symbol: 'BTC', decimals: 6, assetClass: 'crypto' },
  ETH: { code: 'ETH', name: 'Ethereum', symbol: 'ETH', decimals: 4, assetClass: 'crypto' },
}

/**
 * Default standard exchange rates to IDR (Base = IDR 1).
 */
export const DEFAULT_EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  IDR: 1,
  USD: 16_200,
  SGD: 12_100,
  EUR: 17_500,
  JPY: 105,
  MYR: 3_650,
  XAU: 1_450_000, // 1 gram emas Antam
  USDT: 16_250,
  BTC: 1_550_000_000,
  ETH: 52_000_000,
}

/**
 * Formats a currency amount with its native decimals and symbol.
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency = 'IDR'
): string {
  const meta = CURRENCY_METAS[currency] ?? CURRENCY_METAS.IDR
  const isNegative = amount < 0
  const abs = Math.abs(amount)

  if (meta.code === 'IDR') {
    const formatted = Math.round(abs).toLocaleString('id-ID')
    return isNegative ? `−Rp ${formatted}` : `Rp ${formatted}`
  }

  if (meta.code === 'XAU') {
    const formatted = abs.toLocaleString('id-ID', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    })
    return `${isNegative ? '−' : ''}${formatted} gram`
  }

  if (meta.assetClass === 'crypto') {
    const formatted = abs.toLocaleString('en-US', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    })
    return `${isNegative ? '−' : ''}${formatted} ${meta.code}`
  }

  // Non-IDR Fiat (USD, SGD, EUR, JPY, MYR)
  const formatted = abs.toLocaleString(meta.code === 'JPY' ? 'ja-JP' : 'en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  })

  return `${isNegative ? '−' : ''}${meta.symbol} ${formatted}`
}

/**
 * Converts any currency amount to base currency (IDR).
 */
export function convertToBase(
  amount: number,
  currency: SupportedCurrency,
  customRates?: Partial<Record<SupportedCurrency, number>>
): number {
  if (currency === 'IDR') return Math.round(amount)
  const rate = customRates?.[currency] ?? DEFAULT_EXCHANGE_RATES[currency] ?? 1
  return Math.round(amount * rate)
}

/**
 * Converts a base currency (IDR) amount to target currency.
 */
export function convertFromBase(
  amountIDR: number,
  targetCurrency: SupportedCurrency,
  customRates?: Partial<Record<SupportedCurrency, number>>
): number {
  if (targetCurrency === 'IDR') return amountIDR
  const rate = customRates?.[targetCurrency] ?? DEFAULT_EXCHANGE_RATES[targetCurrency] ?? 1
  if (rate <= 0) return 0
  const meta = CURRENCY_METAS[targetCurrency]
  const val = amountIDR / rate
  const factor = Math.pow(10, meta.decimals)
  return Math.round(val * factor) / factor
}

export interface WalletCurrencySummary {
  id: string
  name: string
  currency: SupportedCurrency
  balance: number
  baseEquivalent: number
}

export interface NetWorthRollup {
  totalNetWorth: number // Total in IDR
  breakdown: {
    fiatIDR: number
    forex: number // Non-IDR Fiat in IDR
    gold: number // XAU in IDR
    crypto: number // Crypto in IDR
  }
  percentages: {
    fiatIDR: number
    forex: number
    gold: number
    crypto: number
  }
  wallets: WalletCurrencySummary[]
}

/**
 * Computes consolidated Net Worth in base currency (IDR) with asset class breakdown.
 */
export function calculateNetWorth(
  walletList: Array<{ id: string; name: string; balance: number; currency?: string }>,
  customRates?: Partial<Record<SupportedCurrency, number>>
): NetWorthRollup {
  let fiatIDR = 0
  let forex = 0
  let gold = 0
  let crypto = 0

  const processedWallets: WalletCurrencySummary[] = []

  for (const w of walletList) {
    const rawCurrency = (w.currency?.toUpperCase() || 'IDR') as SupportedCurrency
    const curr = (SUPPORTED_CURRENCIES.includes(rawCurrency) ? rawCurrency : 'IDR') as SupportedCurrency
    const meta = CURRENCY_METAS[curr]
    const baseEq = convertToBase(w.balance, curr, customRates)

    processedWallets.push({
      id: w.id,
      name: w.name,
      currency: curr,
      balance: w.balance,
      baseEquivalent: baseEq,
    })

    if (curr === 'IDR') {
      fiatIDR += baseEq
    } else if (meta.assetClass === 'fiat') {
      forex += baseEq
    } else if (meta.assetClass === 'commodity') {
      gold += baseEq
    } else if (meta.assetClass === 'crypto') {
      crypto += baseEq
    }
  }

  const totalNetWorth = fiatIDR + forex + gold + crypto

  const calcPct = (part: number) =>
    totalNetWorth > 0 ? Math.round((part / totalNetWorth) * 100) : 0

  return {
    totalNetWorth,
    breakdown: {
      fiatIDR,
      forex,
      gold,
      crypto,
    },
    percentages: {
      fiatIDR: calcPct(fiatIDR),
      forex: calcPct(forex),
      gold: calcPct(gold),
      crypto: calcPct(crypto),
    },
    wallets: processedWallets,
  }
}
