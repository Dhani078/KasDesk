'use server'

import { revalidatePath } from 'next/cache'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { wallets, transactions, categories, vaults, debts } from '@/lib/db/schema'
import { TransactionSchema } from '@/lib/schemas'
import { requireUserId } from '@/lib/auth/session'
import type { ActionResponse } from '@/lib/types'

/**
 * Log a transaction and update wallet balance ATOMICALLY.
 *
 * This is the fix for defect §11.4: balances previously never updated because
 * the code assumed a database trigger existed that was never defined.
 * Here we do it explicitly inside a single SQL transaction — either both the
 * transaction row and the balance change commit, or neither does.
 */
export async function createTransaction(
  raw: unknown
): Promise<ActionResponse<{ id: string }>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  const parsed = TransactionSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: first?.message ?? 'Data tidak valid',
        field: first?.path.join('.'),
      },
    }
  }

  const data = parsed.data

  try {
    const id = await db.transaction(async (tx) => {
      // 1. Verify the wallet belongs to this user (authorization at DB level)
      const [wallet] = await tx
        .select({ id: wallets.id, balance: wallets.balance })
        .from(wallets)
        .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId)))
        .limit(1)

      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND')
      }

      // 2. Guard against overdrawing for expenses/transfers
      if (data.type !== 'income' && wallet.balance < data.amount) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      // 3. For transfers, verify the destination wallet too
      if (data.type === 'transfer') {
        const [to] = await tx
          .select({ id: wallets.id })
          .from(wallets)
          .where(and(eq(wallets.id, data.to_wallet_id!), eq(wallets.userId, userId)))
          .limit(1)

        if (!to) throw new Error('WALLET_NOT_FOUND')
      }

      const [row] = await tx.insert(transactions).values({
        userId,
        walletId: data.wallet_id,
        toWalletId: data.to_wallet_id ?? null,
        type: data.type,
        amount: data.amount,
        title: data.title,
        categoryTag: data.category_tag ?? null,
        note: data.note ?? null,
        occurredAt: data.occurred_at ? new Date(data.occurred_at) : new Date(),
      })

      // 4. Update balance atomically
      if (data.type === 'income') {
        await tx.update(wallets)
          .set({ balance: wallet.balance + data.amount })
          .where(eq(wallets.id, data.wallet_id))
      } else if (data.type === 'expense') {
        await tx.update(wallets)
          .set({ balance: wallet.balance - data.amount })
          .where(eq(wallets.id, data.wallet_id))
      } else {
        // transfer: deduct source, credit destination
        await tx.update(wallets)
          .set({ balance: wallet.balance - data.amount })
          .where(eq(wallets.id, data.wallet_id))
        const [toWallet] = await tx
          .select({ balance: wallets.balance })
          .from(wallets)
          .where(eq(wallets.id, data.to_wallet_id!))
          .limit(1)
        await tx.update(wallets)
          .set({ balance: (toWallet?.balance ?? 0) + data.amount })
          .where(eq(wallets.id, data.to_wallet_id!))
      }

      return row.insertId ? String(row.insertId) : crypto.randomUUID()
    })

    revalidatePath('/')
    revalidatePath('/wallets')
    return { success: true, data: { id } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN'
    if (msg === 'INSUFFICIENT_BALANCE') {
      return { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Saldo tidak cukup.' } }
    }
    if (msg === 'WALLET_NOT_FOUND') {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Dompet tidak ditemukan.' } }
    }
    // Never leak internal details to the client
    console.error('[createTransaction]', msg)
    return { success: false, error: { code: 'UNKNOWN', message: 'Terjadi kesalahan. Coba lagi.' } }
  }
}

/** Delete a transaction and reverse its effect on the wallet balance. */
export async function deleteTransaction(id: string): Promise<ActionResponse<null>> {
  const userId = await requireUserId()
  if (!userId) {
    return { success: false, error: { code: 'UNAUTHENTICATED', message: 'Sesi berakhir. Silakan masuk lagi.' } }
  }

  try {
    await db.transaction(async (tx) => {
      const [txRow] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .limit(1)

      if (!txRow) throw new Error('NOT_FOUND')

      const [w] = await tx
        .select({ balance: wallets.balance })
        .from(wallets)
        .where(eq(wallets.id, txRow.walletId))
        .limit(1)

      // Reverse the original effect
      if (txRow.type === 'income') {
        await tx.update(wallets)
          .set({ balance: (w?.balance ?? 0) - txRow.amount })
          .where(eq(wallets.id, txRow.walletId))
      } else if (txRow.type === 'expense') {
        await tx.update(wallets)
          .set({ balance: (w?.balance ?? 0) + txRow.amount })
          .where(eq(wallets.id, txRow.walletId))
      } else if (txRow.toWalletId) {
        await tx.update(wallets)
          .set({ balance: (w?.balance ?? 0) + txRow.amount })
          .where(eq(wallets.id, txRow.walletId))
        const [to] = await tx
          .select({ balance: wallets.balance })
          .from(wallets)
          .where(eq(wallets.id, txRow.toWalletId))
          .limit(1)
        await tx.update(wallets)
          .set({ balance: (to?.balance ?? 0) - txRow.amount })
          .where(eq(wallets.id, txRow.toWalletId))
      }

      await tx.delete(transactions).where(eq(transactions.id, id))
    })

    revalidatePath('/')
    revalidatePath('/wallets')
    return { success: true, data: null }
  } catch (e) {
    console.error('[deleteTransaction]', e instanceof Error ? e.message : e)
    return { success: false, error: { code: 'UNKNOWN', message: 'Gagal menghapus transaksi.' } }
  }
}

/** Recent transactions for the home feed. */
export async function getRecentTransactions(limit = 20) {
  const userId = await requireUserId()
  if (!userId) return []

  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.occurredAt))
    .limit(limit)
}

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

export async function getCategories() {
  const userId = await requireUserId()
  if (!userId) return []

  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.sortOrder)
}

export async function getVaults() {
  const userId = await requireUserId()
  if (!userId) return []

  return db.select().from(vaults).where(eq(vaults.userId, userId))
}

export async function getDebts() {
  const userId = await requireUserId()
  if (!userId) return []

  return db.select().from(debts).where(eq(debts.userId, userId))
}
