/**
 * Tests for Multi-Currency, Forex, Emas & Crypto Net Worth Engine (EPIC 1).
 *
 * Verifies:
 * - Currency formatting with native symbols and decimal precisions.
 * - Negative and zero amounts handling.
 * - Conversion to/from base IDR currency.
 * - Custom exchange rate override.
 * - Consolidated Net Worth rollup with multi-asset breakdown (Fiat, Forex, Gold, Crypto).
 */
import {
  formatCurrency,
  convertToBase,
  convertFromBase,
  calculateNetWorth,
  SUPPORTED_CURRENCIES,
} from "../lib/currency.ts";

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

console.log('=== Multi-Currency, Forex, Emas & Crypto Tests (EPIC 1) ===')

// 1. Supported currencies count
t('supports 10 distinct currencies/assets', SUPPORTED_CURRENCIES.length === 10)

// 2. Formatting tests
t('IDR formats with 0 decimals', formatCurrency(15000000, 'IDR').includes('15.000.000'))
t('IDR negative sign before symbol', formatCurrency(-50000, 'IDR') === '−Rp 50.000')
t('USD formats with 2 decimals and $', formatCurrency(1250.5, 'USD') === '$ 1,250.50')
t('SGD formats with 2 decimals and S$', formatCurrency(850, 'SGD') === 'S$ 850.00')
t('EUR formats with 2 decimals and €', formatCurrency(420.75, 'EUR') === '€ 420.75')
t('JPY formats with 0 decimals and ¥', formatCurrency(35000, 'JPY') === '¥ 35,000')
t('MYR formats with 2 decimals and RM', formatCurrency(210, 'MYR') === 'RM 210.00')
t('XAU formats with 3 decimals and gram', formatCurrency(12.5, 'XAU') === '12,500 gram')
t('BTC formats with 6 decimals and BTC', formatCurrency(0.045, 'BTC') === '0.045000 BTC')
t('ETH formats with 4 decimals and ETH', formatCurrency(1.25, 'ETH') === '1.2500 ETH')
t('USDT formats with 2 decimals and USDT', formatCurrency(150, 'USDT') === '150.00 USDT')

// 3. Conversion to Base (IDR) tests
t('IDR to base is 1:1', convertToBase(100000, 'IDR') === 100000)
t('100 USD converts to 1.620.000 IDR (16.200 rate)', convertToBase(100, 'USD') === 1620000)
t('10 gram XAU converts to 14.500.000 IDR (1.450.000 rate)', convertToBase(10, 'XAU') === 14500000)
t('0.01 BTC converts to 15.500.000 IDR (1.550.000.000 rate)', convertToBase(0.01, 'BTC') === 15500000)
t('Custom rate applies correctly (USD @ 16.500)', convertToBase(100, 'USD', { USD: 16500 }) === 1650000)

// 4. Conversion from Base (IDR) tests
t('1.620.000 IDR converts to 100 USD', convertFromBase(1620000, 'USD') === 100)
t('14.500.000 IDR converts to 10 XAU', convertFromBase(14500000, 'XAU') === 10)

// 5. Net Worth Rollup tests
const testWallets = [
  { id: 'w1', name: 'BCA Utama', balance: 50000000, currency: 'IDR' },
  { id: 'w2', name: 'Kas Tunai', balance: 10000000, currency: 'IDR' },
  { id: 'w3', name: 'Wise USD', balance: 1000, currency: 'USD' }, // 16.200.000 IDR
  { id: 'w4', name: 'Brankas Emas', balance: 20, currency: 'XAU' }, // 29.000.000 IDR
  { id: 'w5', name: 'Binance BTC', balance: 0.02, currency: 'BTC' }, // 31.000.000 IDR
]

const rollup = calculateNetWorth(testWallets)
t('totalNetWorth sums all asset classes (136.200.000 IDR)', rollup.totalNetWorth === 136200000)
t('fiatIDR breakdown is 60.000.000', rollup.breakdown.fiatIDR === 60000000)
t('forex breakdown is 16.200.000', rollup.breakdown.forex === 16200000)
t('gold breakdown is 29.000.000', rollup.breakdown.gold === 29000000)
t('crypto breakdown is 31.000.000', rollup.breakdown.crypto === 31000000)
t('percentages sum close to 100%', Object.values(rollup.percentages).reduce((a, b) => a + b, 0) >= 99)
t('wallets array contains 5 items', rollup.wallets.length === 5)
t('w3 baseEquivalent is 16.200.000', rollup.wallets.find((w) => w.id === 'w3').baseEquivalent === 16200000)

console.log('\n==============================================')
console.log(`RESULT: ${passCount} passed, 0 failed`)
console.log('==============================================')
