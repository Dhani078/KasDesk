'use server'

import { revalidatePath } from 'next/cache'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { debts } from '@/lib/db/schema'
import { DebtSchema } from '@/lib/schemas'
import { requireUserId } from '@/lib/auth/session'
import type { ActionResponse } from '@/lib/types'

export async function getDebts() {
  const userId = await requireUserId()
  if (!userId) return []

  return db
    .select()
    .from(debts)
    .where(eq(debts.userId, userId))
    .orderBy(desc(debts.createdAt))
}

/** Create a debt (utang = I owe, piutang = they owe me). */
export async function createDebt(raw: unknown): Promise<ActionResponse<{ id: string }>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const parsed = DebtSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: first?.message ?? 'Data tidak valid', field: first?.path.join('.') },
    }
  }

  const id = crypto.randomUUID()
  await db.insert(debts).values({
    id,
    userId,
    direction: parsed.data.direction,
    personName: parsed.data.person_name,
    amount: parsed.data.amount,
    paidAmount: 0,
    isPaid: 0,
    note: parsed.data.note ?? null,
    dueDate: parsed.data.due_date ? new Date(parsed.data.due_date) : null,
  })

  revalidatePath('/debts')
  revalidatePath('/')
  revalidatePath('/insights')
  return { success: true, data: { id } }
}

/**
 * Mark a debt as fully paid, or record a PARTIAL payment (FR-DBT-3).
 */
export async function settleDebt(id: string, amount?: number): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const amt = amount === undefined ? null : Math.trunc(Number(amount))
  if (amt !== null && (!Number.isFinite(amt) || amt <= 0)) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Jumlah harus lebih dari 0' } }
  }

  try {
    await db.transaction(async (tx) => {
      const [d] = await tx
        .select({ amount: debts.amount, paidAmount: debts.paidAmount, settledAt: debts.settledAt })
        .from(debts)
        .where(and(eq(debts.id, id), eq(debts.userId, userId)))
        .limit(1)
        .for('update')
      if (!d) throw new Error('NOT_FOUND')

      const remaining = Number(d.amount) - Number(d.paidAmount)
      const pay = amt ?? remaining
      if (pay <= 0 || pay > remaining) throw new Error('OVERPAYMENT')

      const newPaid = Number(d.paidAmount) + pay
      const isPaid = newPaid >= Number(d.amount)
      await tx
        .update(debts)
        .set({ paidAmount: newPaid, isPaid: isPaid ? 1 : 0, settledAt: isPaid ? new Date() : d.settledAt ?? null })
        .where(and(eq(debts.id, id), eq(debts.userId, userId)))
    })

    revalidatePath('/debts')
    revalidatePath('/')
    revalidatePath('/insights')
    return { success: true, data: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN'
    if (msg === 'NOT_FOUND') return { success: false, error: { code: 'NOT_FOUND', message: 'Utang tidak ditemukan.' } }
    if (msg === 'OVERPAYMENT') return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Pembayaran melebihi sisa utang.' } }
    console.error('[settleDebt]', msg)
    return { success: false, error: { code: 'UNKNOWN', message: 'Terjadi kesalahan. Coba lagi.' } }
  }
}

/** Delete a debt. Scoped to the owner. */
export async function deleteDebt(id: string): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const res = await db
    .delete(debts)
    .where(and(eq(debts.id, id), eq(debts.userId, userId)))

  if (!res[0].affectedRows) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Utang tidak ditemukan.' } }
  }

  revalidatePath('/debts')
  revalidatePath('/')
  revalidatePath('/insights')
  return { success: true, data: null }
}
