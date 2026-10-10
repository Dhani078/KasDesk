/**
 * Natural Language Transaction & Intent Parser for KasDesk AI Coach.
 * Extracts intent (financial advice vs transaction logging), transaction parameters,
 * and guards against off-topic/coding requests.
 */

export interface ParsedTransactionDraft {
  type: 'expense' | 'income'
  amount: number
  categoryTag: string
  notes: string
}

export interface NlpParseResult {
  isOffTopicCoding: boolean
  isTransactionIntent: boolean
  transactionDraft?: ParsedTransactionDraft
}

const CODING_REGEX = /\b(coding|koding|bikin kode|buatkan script|buat kode|write code|python script|javascript code|html file|buatkan website|buat program|source code)\b/i

const AMOUNT_PATTERNS = [
  // 1.5jt / 1.5 juta / 2 jt
  /(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i,
  // 18k / 18 k / 18rb / 18 rb
  /(\d+(?:[.,]\d+)?)\s*(?:k|rb|ribu)\b/i,
  // Rp 18.000 / Rp18000 / 18.000 / 18000
  /(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,12})/i,
]

const EXPENSE_KEYWORDS: Record<string, string> = {
  makan: 'MAKAN',
  sarapan: 'MAKAN',
  lunch: 'MAKAN',
  dinner: 'MAKAN',
  soto: 'MAKAN',
  bakso: 'MAKAN',
  kopi: 'MAKAN',
  ngopi: 'MAKAN',
  jajan: 'MAKAN',
  cemilan: 'MAKAN',
  nasi: 'MAKAN',
  bensin: 'TRANSPORT',
  pertalite: 'TRANSPORT',
  pertamax: 'TRANSPORT',
  grab: 'TRANSPORT',
  gojek: 'TRANSPORT',
  parkir: 'TRANSPORT',
  tol: 'TRANSPORT',
  pulsa: 'TAGIHAN',
  listrik: 'TAGIHAN',
  pln: 'TAGIHAN',
  wifi: 'TAGIHAN',
  indihome: 'TAGIHAN',
  kuota: 'TAGIHAN',
  beli: 'BELANJA',
  belanja: 'BELANJA',
  checkout: 'BELANJA',
  shopee: 'BELANJA',
  tokopedia: 'BELANJA',
  obat: 'KESEHATAN',
  dokter: 'KESEHATAN',
  nonton: 'HIBURAN',
  bioskop: 'HIBURAN',
  game: 'HIBURAN',
  netflix: 'HIBURAN',
  spotify: 'HIBURAN',
}

const INCOME_KEYWORDS: Record<string, string> = {
  gaji: 'GAJI',
  salary: 'GAJI',
  payroll: 'GAJI',
  bonus: 'LAINNYA',
  thr: 'LAINNYA',
  terima: 'LAINNYA',
  transferan: 'LAINNYA',
  cair: 'LAINNYA',
  cashback: 'LAINNYA',
  omzet: 'LAINNYA',
  penjualan: 'LAINNYA',
  laku: 'LAINNYA',
}

export function parseCoachMessageNlp(text: string): NlpParseResult {
  const clean = text.trim()
  if (!clean) {
    return { isOffTopicCoding: false, isTransactionIntent: false }
  }

  // 1. Guard against coding & technical dev requests
  if (CODING_REGEX.test(clean)) {
    return {
      isOffTopicCoding: true,
      isTransactionIntent: false,
    }
  }

  // 2. Parse Amount
  let detectedAmount: number | null = null

  const jtMatch = clean.match(AMOUNT_PATTERNS[0])
  if (jtMatch) {
    const num = parseFloat(jtMatch[1].replace(',', '.'))
    if (!Number.isNaN(num)) detectedAmount = Math.round(num * 1_000_000)
  }

  if (!detectedAmount) {
    const kMatch = clean.match(AMOUNT_PATTERNS[1])
    if (kMatch) {
      const num = parseFloat(kMatch[1].replace(',', '.'))
      if (!Number.isNaN(num)) detectedAmount = Math.round(num * 1_000)
    }
  }

  if (!detectedAmount) {
    const rawMatch = clean.match(AMOUNT_PATTERNS[2])
    if (rawMatch) {
      const numStr = rawMatch[1].replace(/\./g, '')
      const num = parseInt(numStr, 10)
      // Disregard years like 2024, 2025, 2026 if lone
      if (!Number.isNaN(num) && (num < 2020 || num > 2030 || clean.toLowerCase().includes('rp'))) {
        detectedAmount = num
      }
    }
  }

  if (!detectedAmount || detectedAmount <= 0) {
    return { isOffTopicCoding: false, isTransactionIntent: false }
  }

  // 3. Determine Expense vs Income
  const lower = clean.toLowerCase()
  let isIncome = false
  let categoryTag = 'UMUM'

  for (const [kw, cat] of Object.entries(INCOME_KEYWORDS)) {
    if (lower.includes(kw)) {
      isIncome = true
      categoryTag = cat
      break
    }
  }

  if (!isIncome) {
    for (const [kw, cat] of Object.entries(EXPENSE_KEYWORDS)) {
      if (lower.includes(kw)) {
        categoryTag = cat
        break
      }
    }
  }

  // If no specific category matched, check if general payment verbs exist
  const hasVerb =
    isIncome ||
    lower.includes('beli') ||
    lower.includes('bayar') ||
    lower.includes('keluar') ||
    lower.includes('habis') ||
    lower.includes('makan') ||
    categoryTag !== 'UMUM'

  if (!hasVerb) {
    return { isOffTopicCoding: false, isTransactionIntent: false }
  }

  let notes = clean
  // Truncate to reasonable length
  if (notes.length > 80) {
    notes = notes.slice(0, 80)
  }

  return {
    isOffTopicCoding: false,
    isTransactionIntent: true,
    transactionDraft: {
      type: isIncome ? 'income' : 'expense',
      amount: detectedAmount,
      categoryTag,
      notes,
    },
  }
}
