'use server'

import { and, eq, gte, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { budgets, recurringRules, transactions, wallets } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { convertToBase, DEFAULT_EXCHANGE_RATES, type SupportedCurrency } from '@/lib/currency'

export type PlanningState = { error?: string; success?: string } | null
const budgetSchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), category: z.enum(CATEGORY_ENUM), amount: z.coerce.number().int().positive().max(100_000_000_000) })
const recurringSchema = z.object({ title: z.string().trim().min(1).max(120), type: z.enum(['income', 'expense']), amount: z.coerce.number().int().positive().max(100_000_000_000), category: z.enum(CATEGORY_ENUM), frequency: z.enum(['weekly', 'monthly']), nextRunAt: z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), 'Jadwal tidak valid') })

export async function saveBudgetAction(_state: PlanningState, formData: FormData): Promise<PlanningState> {
  const userId = await requireUserId()
  if (!userId) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  const cleanAmount = String(formData.get('amount') ?? '').replace(/[^\d]/g, '')
  const parsed = budgetSchema.safeParse({ month: formData.get('month'), category: formData.get('category'), amount: cleanAmount })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Budget tidak valid.' }
  try {
    await db.insert(budgets).values({ userId, month: parsed.data.month, categoryTag: parsed.data.category, amount: parsed.data.amount }).onDuplicateKeyUpdate({ set: { amount: parsed.data.amount } })
    revalidatePath('/planning'); revalidatePath('/insights')
    return { success: 'Budget tersimpan.' }
  } catch { return { error: 'Budget gagal disimpan. Coba lagi.' } }
}

export async function createRecurringAction(_state: PlanningState, formData: FormData): Promise<PlanningState> {
  const userId = await requireUserId()
  if (!userId) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  const cleanAmount = String(formData.get('amount') ?? '').replace(/[^\d]/g, '')
  const parsed = recurringSchema.safeParse({ title: formData.get('title'), type: formData.get('type'), amount: cleanAmount, category: formData.get('category'), frequency: formData.get('frequency'), nextRunAt: formData.get('nextRunAt') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Pengingat tidak valid.' }
  try {
    await db.insert(recurringRules).values({ userId, title: parsed.data.title, type: parsed.data.type, amount: parsed.data.amount, categoryTag: parsed.data.category, frequency: parsed.data.frequency, nextRunAt: parsed.data.nextRunAt })
    revalidatePath('/planning')
    return { success: 'Pengingat ditambahkan.' }
  } catch { return { error: 'Pengingat gagal ditambahkan. Coba lagi.' } }
}

export async function deleteBudget(formData: FormData) {
  const userId = await requireUserId(); const id = String(formData.get('id') ?? '')
  if (!userId || !id) return
  await db.delete(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
  revalidatePath('/planning'); revalidatePath('/insights')
}
export async function deleteRecurring(formData: FormData) {
  const userId = await requireUserId(); const id = String(formData.get('id') ?? '')
  if (!userId || !id) return
  await db.delete(recurringRules).where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
  revalidatePath('/planning')
}
export async function toggleRecurring(formData: FormData) {
  const userId = await requireUserId(); const id = String(formData.get('id') ?? '')
  if (!userId || !id) return
  const [rule] = await db.select({ active: recurringRules.isActive }).from(recurringRules).where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId))).limit(1)
  if (!rule) return
  await db.update(recurringRules).set({ isActive: rule.active ? 0 : 1 }).where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
  revalidatePath('/planning')
}

export async function executeRecurringAction(formData: FormData) {
  const userId = await requireUserId()
  const id = String(formData.get('id') ?? '')
  const walletId = String(formData.get('walletId') ?? '')
  if (!userId || !id) return

  const [rule] = await db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
    .limit(1)
  if (!rule) return

  let targetWalletId = walletId
  if (!targetWalletId) {
    const [w] = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(and(eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
      .limit(1)
    targetWalletId = w?.id ?? ''
  }
  if (!targetWalletId) return

  const [targetWallet] = await db
    .select({ id: wallets.id, balance: wallets.balance, isArchived: wallets.isArchived, currency: wallets.currency })
    .from(wallets)
    .where(and(eq(wallets.id, targetWalletId), eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
    .limit(1)
  if (!targetWallet) return

  if (rule.type === 'expense' && Number(targetWallet.balance) < rule.amount) {
    return
  }

  const curr = (targetWallet.currency ?? 'IDR') as SupportedCurrency
  const rate = DEFAULT_EXCHANGE_RATES[curr] ?? 1
  const baseAmount = convertToBase(rule.amount, curr)

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      userId,
      walletId: targetWalletId,
      type: rule.type,
      amount: rule.amount,
      currency: curr,
      exchangeRate: String(rate),
      baseAmount,
      title: rule.title,
      categoryTag: rule.categoryTag ?? 'TAGIHAN',
      note: `Transaksi rutin otomatis (${rule.frequency === 'monthly' ? 'Bulanan' : 'Mingguan'})`,
      occurredAt: new Date(),
    })

    if (rule.type === 'expense') {
      const debit = await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} - ${rule.amount}` })
        .where(and(eq(wallets.id, targetWalletId), eq(wallets.userId, userId), eq(wallets.isArchived, 0), gte(wallets.balance, rule.amount)))
      if (!debit[0].affectedRows) throw new Error('INSUFFICIENT_BALANCE')
    } else {
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${rule.amount}` })
        .where(and(eq(wallets.id, targetWalletId), eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
    }

    const currentNext = new Date(rule.nextRunAt)
    const nextDate = new Date(currentNext)
    if (rule.frequency === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7)
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1)
    }

    await tx
      .update(recurringRules)
      .set({ nextRunAt: nextDate })
      .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
  })

  revalidatePath('/planning')
  revalidatePath('/')
  revalidatePath('/wallets')
  revalidatePath('/insights')
  revalidatePath('/transactions')
  revalidatePath(`/wallets/${targetWalletId}`)
}

export async function applyAiBudgetBatchAction(params: {
  month: string
  items: { category: (typeof CATEGORY_ENUM)[number]; amount: number }[]
}): Promise<{ success: boolean; count?: number; error?: string }> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: 'UNAUTHENTICATED' }

  const { month, items } = params
  if (!items?.length) return { success: false, error: 'Tidak ada item budget yang dipilih' }

  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        if (!item.amount || item.amount <= 0) continue
        await tx
          .insert(budgets)
          .values({
            userId,
            month,
            categoryTag: item.category,
            amount: item.amount,
          })
          .onDuplicateKeyUpdate({ set: { amount: item.amount } })
      }
    })

    revalidatePath('/planning')
    revalidatePath('/insights')
    return { success: true, count: items.length }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Gagal menerapkan rekomendasi AI' }
  }
}

