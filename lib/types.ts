/** Discriminated-union result type — never throw across the server/client boundary. */
export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; field?: string } }

export type TxType = 'income' | 'expense' | 'transfer'
export type WalletType = 'cash' | 'bank' | 'e-wallet'
export type DebtDirection = 'utang' | 'piutang'

export const CATEGORIES = [
  'MAKAN',
  'TRANSPORT',
  'BELANJA',
  'TAGIHAN',
  'HIBURAN',
  'KESEHATAN',
  'PENDIDIKAN',
  'GAJI',
  'LAINNYA',
] as const

export type CategoryName = (typeof CATEGORIES)[number]

export const AI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
] as const

export type AiModel = (typeof AI_MODELS)[number]
