'use server'

import { revalidatePath } from 'next/cache'
import { eq, and, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { vaults, wallets } from '@/lib/db/schema'
import { VaultSchema } from '@/lib/schemas'
import { isArchivedWallet } from '@/lib/wallet-guard'
import { requireUserId } from '@/lib/auth/session'
import type { ActionResponse } from '@/lib/types'

export async function getVaults() {
  const userId = await requireUserId()
  if (!userId) return []

  return db.select().from(vaults).where(eq(vaults.userId, userId))
}

/** Create a savings target. */
export async function createVault(raw: unknown): Promise<ActionResponse<{ id: string }>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const parsed = VaultSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: first?.message ?? 'Data tidak valid', field: first?.path.join('.') },
    }
  }

  const id = crypto.randomUUID()
  await db.insert(vaults).values({
    id,
    userId,
    name: parsed.data.name,
    targetAmount: parsed.data.target_amount,
    currentAmount: 0,
    targetDate: parsed.data.target_date ? new Date(parsed.data.target_date) : null,
    isCompleted: 0,
  })

  revalidatePath('/vaults')
  revalidatePath('/')
  return { success: true, data: { id } }
}

/**
 * Move money from a wallet into a vault.
 * Atomic on both legs; refuses if the wallet lacks funds or isn't yours.
 */
export async function depositToVault(
  vaultId: string,
  walletId: string,
  amount: number,
): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const amt = Math.trunc(Number(amount))
  if (!Number.isFinite(amt) || amt <= 0) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Jumlah harus lebih dari 0' } }
  }

  try {
    await db.transaction(async (tx) => {
      const [w] = await tx
        .select({ balance: wallets.balance, isArchived: wallets.isArchived })
        .from(wallets)
        .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)))
        .limit(1)
      if (!w) throw new Error('WALLET_NOT_FOUND')
      if (isArchivedWallet(w)) throw new Error('WALLET_ARCHIVED')
      if (Number(w.balance) < amt) throw new Error('INSUFFICIENT_BALANCE')

      const [v] = await tx
        .select({ id: vaults.id, targetAmount: vaults.targetAmount })
        .from(vaults)
        .where(and(eq(vaults.id, vaultId), eq(vaults.userId, userId)))
        .limit(1)
      if (!v) throw new Error('VAULT_NOT_FOUND')

      const debit = await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} - ${amt}` })
        .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId), eq(wallets.isArchived, 0), gte(wallets.balance, amt)))
      if (!debit[0].affectedRows) throw new Error('INSUFFICIENT_BALANCE')
      await tx
        .update(vaults)
        .set({ currentAmount: sql`${vaults.currentAmount} + ${amt}` })
        .where(eq(vaults.id, vaultId))

      const [after] = await tx
        .select({ currentAmount: vaults.currentAmount })
        .from(vaults)
        .where(eq(vaults.id, vaultId))
        .limit(1)
      if (after && Number(after.currentAmount) >= Number(v.targetAmount)) {
        await tx.update(vaults).set({ isCompleted: 1 }).where(eq(vaults.id, vaultId))
      }
    })

    revalidatePath('/vaults')
    revalidatePath('/wallets')
    revalidatePath('/')
    return { success: true, data: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN'
    if (msg === 'INSUFFICIENT_BALANCE') {
      return { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Saldo dompet tidak cukup.' } }
    }
    if (msg === 'WALLET_NOT_FOUND' || msg === 'VAULT_NOT_FOUND') {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Dompet atau target tidak ditemukan.' } }
    }
    if (msg === 'WALLET_ARCHIVED') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dompet ini sudah diarsipkan dan tidak bisa dipakai.' },
      }
    }
    console.error('[depositToVault]', msg)
    return { success: false, error: { code: 'UNKNOWN', message: 'Terjadi kesalahan. Coba lagi.' } }
  }
}

/** Take money back out of a vault into a wallet (reverse of deposit). */
export async function withdrawFromVault(
  vaultId: string,
  walletId: string,
  amount: number,
): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const amt = Math.trunc(Number(amount))
  if (!Number.isFinite(amt) || amt <= 0) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Jumlah harus lebih dari 0' } }
  }

  try {
    await db.transaction(async (tx) => {
      const [v] = await tx
        .select({ currentAmount: vaults.currentAmount })
        .from(vaults)
        .where(and(eq(vaults.id, vaultId), eq(vaults.userId, userId)))
        .limit(1)
      if (!v) throw new Error('VAULT_NOT_FOUND')
      if (Number(v.currentAmount) < amt) throw new Error('INSUFFICIENT_BALANCE')

      const [w] = await tx
        .select({ id: wallets.id, isArchived: wallets.isArchived })
        .from(wallets)
        .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)))
        .limit(1)
      if (!w) throw new Error('WALLET_NOT_FOUND')
      if (isArchivedWallet(w)) throw new Error('WALLET_ARCHIVED')

      const debit = await tx
        .update(vaults)
        .set({ currentAmount: sql`${vaults.currentAmount} - ${amt}` })
        .where(and(eq(vaults.id, vaultId), eq(vaults.userId, userId), gte(vaults.currentAmount, amt)))
      if (!debit[0].affectedRows) throw new Error('INSUFFICIENT_BALANCE')
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${amt}` })
        .where(eq(wallets.id, walletId))

      await tx
        .update(vaults)
        .set({ isCompleted: 0 })
        .where(and(eq(vaults.id, vaultId), sql`${vaults.currentAmount} < ${vaults.targetAmount}`))
    })

    revalidatePath('/vaults')
    revalidatePath('/wallets')
    revalidatePath('/')
    return { success: true, data: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN'
    if (msg === 'INSUFFICIENT_BALANCE') {
      return { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Dana di target tidak cukup.' } }
    }
    if (msg === 'WALLET_NOT_FOUND' || msg === 'VAULT_NOT_FOUND') {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Dompet atau target tidak ditemukan.' } }
    }
    if (msg === 'WALLET_ARCHIVED') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dompet ini sudah diarsipkan dan tidak bisa dipakai.' },
      }
    }
    console.error('[withdrawFromVault]', msg)
    return { success: false, error: { code: 'UNKNOWN', message: 'Terjadi kesalahan. Coba lagi.' } }
  }
}

/** Delete a vault. Scoped to the owner. Requires currentAmount === 0 to prevent balance loss. */
export async function deleteVault(id: string): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const [v] = await db
    .select({ currentAmount: vaults.currentAmount })
    .from(vaults)
    .where(and(eq(vaults.id, id), eq(vaults.userId, userId)))
    .limit(1)

  if (!v) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Target tidak ditemukan.' } }
  }

  if (Number(v.currentAmount) > 0) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Tarik sisa saldo target ke dompet sebelum menghapus.' },
    }
  }

  await db.delete(vaults).where(and(eq(vaults.id, id), eq(vaults.userId, userId)))

  revalidatePath('/vaults')
  revalidatePath('/')
  return { success: true, data: null }
}
