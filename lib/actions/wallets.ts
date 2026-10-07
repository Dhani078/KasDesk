'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { wallets, categories } from '@/lib/db/schema'
import { WalletSchema } from '@/lib/schemas'
import { requireUserId } from '@/lib/auth/session'
import type { ActionResponse } from '@/lib/types'

/** Non-archived wallets. */
export async function getWallets() {
  const userId = await requireUserId()
  if (!userId) return []

  return db
    .select()
    .from(wallets)
    .where(and(eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
    .orderBy(wallets.name)
}

/**
 * Same as getWallets() but INCLUDING archived ones.
 */
export async function getWalletsIncludingArchived() {
  const userId = await requireUserId()
  if (!userId) return []

  return db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .orderBy(wallets.name)
}

/** Create a wallet owned by the current user. */
export async function createWallet(
  raw: unknown
): Promise<ActionResponse<{ id: string }>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const parsed = WalletSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: first?.message ?? 'Data tidak valid', field: first?.path.join('.') },
    }
  }

  const id = crypto.randomUUID()
  await db.insert(wallets).values({
    id,
    userId,
    name: parsed.data.name,
    type: parsed.data.type,
    balance: parsed.data.balance,
  })

  revalidatePath('/wallets')
  revalidatePath('/')
  return { success: true, data: { id } }
}

/**
 * Archive or un-archive one of the user's wallets.
 */
export async function archiveWallet(
  walletId: string,
  archived: boolean,
): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  if (!walletId || typeof walletId !== 'string') {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Dompet tidak valid.' } }
  }

  try {
    const res = await db
      .update(wallets)
      .set({ isArchived: archived ? 1 : 0 })
      .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)))

    if (!res[0].affectedRows) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Dompet tidak ditemukan.' } }
    }

    revalidatePath('/wallets')
    revalidatePath(`/wallets/${walletId}`)
    revalidatePath('/')
    return { success: true, data: null }
  } catch (e) {
    console.error('[archiveWallet]', e instanceof Error ? e.message : e)
    return { success: false, error: { code: 'UNKNOWN', message: 'Gagal mengubah dompet.' } }
  }
}

/** Custom user categories. */
export async function getCategories() {
  const userId = await requireUserId()
  if (!userId) return []

  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.sortOrder)
}
