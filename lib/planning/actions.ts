'use server'

import { and, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { budgets, recurringRules, transactions, wallets } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { CATEGORY_ENUM } from '@/lib/schemas'

export type PlanningState = { error?: string; success?: string } | null
const budgetSchema = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), category: z.enum(CATEGORY_ENUM), amount: z.coerce.number().int().positive().max(100_000_000_000) })
const recurringSchema = z.object({ title: z.string().trim().min(1).max(120), type: z.enum(['income', 'expense']), amount: z.coerce.number().int().positive().max(100_000_000_000), category: z.enum(CATEGORY_ENUM), frequency: z.enum(['weekly', 'monthly']), nextRunAt: z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), 'Jadwal tidak valid') })

export async function saveBudgetAction(_state: PlanningState, formData: FormData): Promise<PlanningState> {
  const userId = await requireUserId()
  if (!userId) return { error: 'Sesi berakhir. Silakan masuk kembali.' }
  const parsed = budgetSchema.safeParse({ month: formData.get('month'), category: formData.get('category'), amount: formData.get('amount') })
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
  const parsed = recurringSchema.safeParse({ title: formData.get('title'), type: formData.get('type'), amount: formData.get('amount'), category: formData.get('category'), frequency: formData.get('frequency'), nextRunAt: formData.get('nextRunAt') })
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

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      userId,
      walletId: targetWalletId,
      type: rule.type,
      amount: rule.amount,
      title: rule.title,
      categoryTag: rule.categoryTag ?? 'TAGIHAN',
      note: `Transaksi rutin otomatis (${rule.frequency === 'monthly' ? 'Bulanan' : 'Mingguan'})`,
      occurredAt: new Date(),
    })

    const balanceDelta = rule.type === 'income' ? rule.amount : -rule.amount
    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${balanceDelta}` })
      .where(and(eq(wallets.id, targetWalletId), eq(wallets.userId, userId)))

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
  revalidatePath('/insights')
  revalidatePath('/transactions')
}
