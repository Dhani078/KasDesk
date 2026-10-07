'use server'

import { revalidatePath } from 'next/cache'
import { eq, and, desc, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { wallets, transactions, vaults } from '@/lib/db/schema'
import { TransactionSchema } from '@/lib/schemas'
import { isArchivedWallet } from '@/lib/wallet-guard'
import { requireUserId } from '@/lib/auth/session'
import { convertToBase, DEFAULT_EXCHANGE_RATES, type SupportedCurrency } from '@/lib/currency'
import type { ActionResponse } from '@/lib/types'

/**
 * Log a transaction and update wallet balance ATOMICALLY.
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
      if (data.client_mutation_id) {
        const [existing] = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(and(eq(transactions.userId, userId), eq(transactions.clientMutationId, data.client_mutation_id)))
          .limit(1)
        if (existing) return existing.id
      }

      const [wallet] = await tx
        .select({ id: wallets.id, balance: wallets.balance, isArchived: wallets.isArchived, currency: wallets.currency })
        .from(wallets)
        .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId)))
        .limit(1)

      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND')
      }

      if (isArchivedWallet(wallet)) {
        throw new Error('WALLET_ARCHIVED')
      }

      if (data.type !== 'income' && wallet.balance < data.amount) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      if (data.type === 'transfer') {
        if (data.to_wallet_id === data.wallet_id) {
          throw new Error('SAME_WALLET')
        }

        const [to] = await tx
          .select({ id: wallets.id, isArchived: wallets.isArchived })
          .from(wallets)
          .where(and(eq(wallets.id, data.to_wallet_id!), eq(wallets.userId, userId)))
          .limit(1)

        if (!to) throw new Error('WALLET_NOT_FOUND')
        if (isArchivedWallet(to)) throw new Error('WALLET_ARCHIVED')
      }

      const txId = crypto.randomUUID()
      const txCurrency = (data.currency ?? wallet.currency ?? 'IDR') as SupportedCurrency
      const rate = DEFAULT_EXCHANGE_RATES[txCurrency] ?? 1
      const baseAmount = convertToBase(data.amount, txCurrency)

      await tx.insert(transactions).values({
        id: txId,
        userId,
        walletId: data.wallet_id,
        toWalletId: data.to_wallet_id ?? null,
        clientMutationId: data.client_mutation_id ?? null,
        type: data.type,
        amount: data.amount,
        currency: txCurrency,
        exchangeRate: String(rate),
        baseAmount,
        title: data.title,
        categoryTag: data.category_tag ?? null,
        note: data.note ?? null,
        occurredAt: data.occurred_at ? new Date(data.occurred_at) : new Date(),
      })

      if (data.type === 'income') {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${data.amount}` })
          .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
      } else if (data.type === 'expense') {
        const roundUpAmt = (data.round_up_amount && data.round_up_amount > 0 && data.round_up_vault_id) ? data.round_up_amount : 0
        const totalDebit = data.amount + roundUpAmt

        const debit = await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${totalDebit}` })
          .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId), eq(wallets.isArchived, 0), gte(wallets.balance, totalDebit)))
        if (!debit[0].affectedRows) throw new Error('INSUFFICIENT_BALANCE')

        if (roundUpAmt > 0 && data.round_up_vault_id) {
          const [targetVault] = await tx
            .select({ id: vaults.id, targetAmount: vaults.targetAmount })
            .from(vaults)
            .where(and(eq(vaults.id, data.round_up_vault_id), eq(vaults.userId, userId)))
            .limit(1)

          if (targetVault) {
            await tx
              .update(vaults)
              .set({ currentAmount: sql`${vaults.currentAmount} + ${roundUpAmt}` })
              .where(eq(vaults.id, data.round_up_vault_id))

            const [vAfter] = await tx
              .select({ currentAmount: vaults.currentAmount })
              .from(vaults)
              .where(eq(vaults.id, data.round_up_vault_id))
              .limit(1)

            if (vAfter && Number(vAfter.currentAmount) >= Number(targetVault.targetAmount)) {
              await tx
                .update(vaults)
                .set({ isCompleted: 1 })
                .where(eq(vaults.id, data.round_up_vault_id))
            }

            await tx.insert(transactions).values({
              id: crypto.randomUUID(),
              userId,
              walletId: data.wallet_id,
              type: 'expense',
              amount: roundUpAmt,
              title: `Celengan: ${data.title}`,
              categoryTag: 'LAINNYA',
              note: 'Alokasi Celengan Pembulatan',
              occurredAt: data.occurred_at ? new Date(data.occurred_at) : new Date(),
            })
          }
        }
      } else {
        const debit = await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${data.amount}` })
          .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId), eq(wallets.isArchived, 0), gte(wallets.balance, data.amount)))
        if (!debit[0].affectedRows) throw new Error('INSUFFICIENT_BALANCE')
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${data.amount}` })
          .where(and(eq(wallets.id, data.to_wallet_id!), eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
      }

      return txId
    })

    revalidatePath('/')
    revalidatePath('/wallets')
    revalidatePath('/insights')
    if (data.round_up_vault_id && data.round_up_amount) {
      revalidatePath('/vaults')
    }
    revalidatePath(`/wallets/${data.wallet_id}`)
    if (data.type === 'transfer' && data.to_wallet_id) {
      revalidatePath(`/wallets/${data.to_wallet_id}`)
    }
    return { success: true, data: { id } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN'
    if (msg === 'INSUFFICIENT_BALANCE') {
      return { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Saldo tidak cukup.' } }
    }
    if (msg === 'WALLET_NOT_FOUND') {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Dompet tidak ditemukan.' } }
    }
    if (msg === 'SAME_WALLET') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dompet asal dan tujuan tidak boleh sama.' },
      }
    }
    if (msg === 'WALLET_ARCHIVED') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Dompet ini sudah diarsipkan dan tidak bisa dipakai.' },
      }
    }
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
    let affectedWalletId: string | null = null
    let affectedToWalletId: string | null = null

    await db.transaction(async (tx) => {
      const [txRow] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .limit(1)

      if (!txRow) throw new Error('NOT_FOUND')

      affectedWalletId = txRow.walletId
      affectedToWalletId = txRow.toWalletId

      const [w] = await tx
        .select({ balance: wallets.balance, isArchived: wallets.isArchived })
        .from(wallets)
        .where(eq(wallets.id, txRow.walletId))
        .limit(1)

      if (!w) throw new Error('WALLET_NOT_FOUND')

      if (txRow.type === 'income') {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${txRow.amount}` })
          .where(eq(wallets.id, txRow.walletId))
      } else if (txRow.type === 'expense') {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${txRow.amount}` })
          .where(eq(wallets.id, txRow.walletId))
      } else if (txRow.toWalletId) {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${txRow.amount}` })
          .where(eq(wallets.id, txRow.walletId))
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${txRow.amount}` })
          .where(eq(wallets.id, txRow.toWalletId))
      }

      await tx
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    })

    revalidatePath('/')
    revalidatePath('/wallets')
    revalidatePath('/insights')
    if (affectedWalletId) revalidatePath(`/wallets/${affectedWalletId}`)
    if (affectedToWalletId) revalidatePath(`/wallets/${affectedToWalletId}`)
    return { success: true, data: null }
  } catch (e) {
    console.error('[deleteTransaction]', e instanceof Error ? e.message : e)
    return { success: false, error: { code: 'UNKNOWN', message: 'Gagal menghapus transaksi.' } }
  }
}

/** FR-TXN-4: edit a transaction, recomputing wallet balances atomically. */
export async function updateTransaction(
  id: string,
  raw: unknown,
): Promise<ActionResponse<null>> {
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
    let affectedWalletId: string | null = null
    let affectedToWalletId: string | null = null

    await db.transaction(async (tx) => {
      const [txRow] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .limit(1)
      if (!txRow) throw new Error('NOT_FOUND')

      if (data.type !== txRow.type) throw new Error('TYPE_IMMUTABLE')

      const oldWallet = txRow.walletId
      const oldTo = txRow.toWalletId as string | null
      affectedWalletId = oldWallet
      affectedToWalletId = oldTo

      if (txRow.type === 'income') {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${txRow.amount}` }).where(eq(wallets.id, oldWallet))
      } else if (txRow.type === 'expense') {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${txRow.amount}` }).where(eq(wallets.id, oldWallet))
      } else if (oldTo) {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${txRow.amount}` }).where(eq(wallets.id, oldWallet))
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${txRow.amount}` }).where(eq(wallets.id, oldTo))
      }

      const isTransfer = txRow.type === 'transfer'
      const newSource = isTransfer ? oldWallet : data.wallet_id
      const newTo = isTransfer ? oldTo : (data.type === 'transfer' ? data.to_wallet_id ?? null : null)

      const [ws] = await tx
        .select({ id: wallets.id, isArchived: wallets.isArchived })
        .from(wallets)
        .where(and(eq(wallets.id, newSource), eq(wallets.userId, userId)))
        .limit(1)
      if (!ws) throw new Error('WALLET_NOT_FOUND')
      if (isArchivedWallet(ws)) throw new Error('WALLET_ARCHIVED')

      if (data.type === 'transfer' || isTransfer) {
        if (newTo) {
          const [wd] = await tx
            .select({ id: wallets.id, isArchived: wallets.isArchived })
            .from(wallets)
            .where(and(eq(wallets.id, newTo), eq(wallets.userId, userId)))
            .limit(1)
          if (!wd) throw new Error('WALLET_NOT_FOUND')
          if (isArchivedWallet(wd)) throw new Error('WALLET_ARCHIVED')
        } else if (!isTransfer) {
          throw new Error('WALLET_NOT_FOUND')
        }
      } else if (newTo) {
        throw new Error('SAME_WALLET')
      }

      const type = txRow.type as string
      if (type !== 'income') {
        const [b] = await tx.select({ balance: wallets.balance }).from(wallets).where(eq(wallets.id, newSource)).limit(1)
        if (!b || Number(b.balance) < data.amount) throw new Error('INSUFFICIENT_BALANCE')
      }

      if (type === 'income') {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${data.amount}` }).where(eq(wallets.id, newSource))
      } else if (type === 'expense') {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${data.amount}` }).where(eq(wallets.id, newSource))
      } else if (newTo) {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${data.amount}` }).where(eq(wallets.id, newSource))
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${data.amount}` }).where(eq(wallets.id, newTo))
      }

      await tx.update(transactions).set({
        walletId: newSource,
        toWalletId: newTo,
        amount: data.amount,
        title: data.title,
        categoryTag: data.category_tag ?? txRow.categoryTag,
        note: data.note ?? txRow.note,
        occurredAt: data.occurred_at ? new Date(data.occurred_at) : txRow.occurredAt,
      }).where(eq(transactions.id, id))
    })

    revalidatePath('/')
    revalidatePath('/wallets')
    revalidatePath('/insights')
    if (affectedWalletId) revalidatePath(`/wallets/${affectedWalletId}`)
    if (affectedToWalletId) revalidatePath(`/wallets/${affectedToWalletId}`)
    return { success: true, data: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN'
    if (msg === 'NOT_FOUND') {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan.' } }
    }
    if (msg === 'INSUFFICIENT_BALANCE') {
      return { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Saldo tidak cukup.' } }
    }
    if (msg === 'WALLET_ARCHIVED') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Dompet ini sudah diarsipkan dan tidak bisa dipakai.' } }
    }
    if (msg === 'WALLET_NOT_FOUND') {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Dompet tidak ditemukan.' } }
    }
    if (msg === 'SAME_WALLET') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Dompet asal dan tujuan tidak boleh sama.' } }
    }
    if (msg === 'TYPE_IMMUTABLE') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Jenis transaksi tidak bisa diubah.' } }
    }
    console.error('[updateTransaction]', msg)
    return { success: false, error: { code: 'UNKNOWN', message: 'Terjadi kesalahan. Coba lagi.' } }
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
