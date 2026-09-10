import { z } from 'zod'

export const CATEGORY_ENUM = [
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

/** Registration: email + password (Auth.js credentials). */
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email tidak valid').max(255),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(72, 'Password maksimal 72 karakter'), // bcrypt truncates past 72 bytes
  name: z.string().trim().min(1).max(120).optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const TransactionSchema = z
  .object({
    wallet_id: z.string().min(1, 'Dompet wajib dipilih'),
    to_wallet_id: z.string().min(1).optional(),
    type: z.enum(['income', 'expense', 'transfer']),
    // Defect §11.3 fix: amount must be strictly positive
    amount: z
      .number({ message: 'Jumlah harus angka' })
      .int('Jumlah harus bilangan bulat')
      .positive('Jumlah harus lebih dari 0')
      .max(100_000_000_000, 'Jumlah terlalu besar'),
    title: z.string().trim().min(1, 'Judul wajib diisi').max(120, 'Judul terlalu panjang'),
    category_tag: z.enum(CATEGORY_ENUM).optional(),
    note: z.string().trim().max(500, 'Catatan terlalu panjang').optional(),
    occurred_at: z.string().datetime().optional(),
  })
  .refine((d) => d.type !== 'transfer' || !!d.to_wallet_id, {
    message: 'Transfer memerlukan dompet tujuan',
    path: ['to_wallet_id'],
  })
  .refine((d) => d.type !== 'transfer' || d.wallet_id !== d.to_wallet_id, {
    message: 'Dompet asal dan tujuan tidak boleh sama',
    path: ['to_wallet_id'],
  })

export type TransactionInput = z.infer<typeof TransactionSchema>

export const WalletSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(60),
  type: z.enum(['cash', 'bank', 'e-wallet']),
  balance: z.number().int().min(0, 'Saldo tidak boleh negatif').max(100_000_000_000),
})

export const VaultSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(80),
  target_amount: z.number().int().positive('Target harus lebih dari 0'),
  target_date: z.string().datetime().optional(),
})

export const DebtSchema = z.object({
  direction: z.enum(['utang', 'piutang']),
  person_name: z.string().trim().min(1, 'Nama wajib diisi').max(80),
  amount: z.number().int().positive('Jumlah harus lebih dari 0'),
  note: z.string().trim().max(500).optional(),
  due_date: z.string().datetime().optional(),
})

/** Gemini OCR response — validated before use (SR-11). */
export const GeminiOCRResponseSchema = z.object({
  merchant_name: z.string(),
  items: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
      })
    )
    .default([]),
  detected_total: z.number(),
  confidence_score: z.number().min(0).max(1),
  detected_category: z.enum(CATEGORY_ENUM).catch('LAINNYA'),
})

export type GeminiOCRResponse = z.infer<typeof GeminiOCRResponseSchema>
