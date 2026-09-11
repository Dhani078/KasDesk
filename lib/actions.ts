'use server'

import { revalidatePath } from 'next/cache'
import { eq, and, desc, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { wallets, transactions, categories, vaults, debts } from '@/lib/db/schema'
import { TransactionSchema, WalletSchema, DebtSchema, VaultSchema } from '@/lib/schemas'
import { isArchivedWallet } from '@/lib/wallet-guard'
import { requireUserId } from '@/lib/auth/session'
import { getMonthWindow } from '@/lib/timezone'
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
      if (data.client_mutation_id) {
        const [existing] = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(and(eq(transactions.userId, userId), eq(transactions.clientMutationId, data.client_mutation_id)))
          .limit(1)
        if (existing) return existing.id
      }

      // 1. Verify the wallet belongs to this user (authorization at DB level)
      //    AND is not archived. Archived wallets are excluded from Total Saldo,
      //    so spending from one would make money vanish from every headline
      //    number with no visible cause. getWallets() already hides them from
      //    the UI; this rejects it at the source too.
      const [wallet] = await tx
        .select({ id: wallets.id, balance: wallets.balance, isArchived: wallets.isArchived })
        .from(wallets)
        .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId)))
        .limit(1)

      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND')
      }

      if (isArchivedWallet(wallet)) {
        throw new Error('WALLET_ARCHIVED')
      }

      // 2. Guard against overdrawing for expenses/transfers
      if (data.type !== 'income' && wallet.balance < data.amount) {
        throw new Error('INSUFFICIENT_BALANCE')
      }

      // 3. For transfers, verify the destination wallet too
      if (data.type === 'transfer') {
        // Transferring to the same wallet is a no-op that still writes a
        // transaction row and burns an ID. Worse: it silently succeeds while
        // looking like real activity. Reject it.
        if (data.to_wallet_id === data.wallet_id) {
          throw new Error('SAME_WALLET')
        }

        const [to] = await tx
          .select({ id: wallets.id, isArchived: wallets.isArchived })
          .from(wallets)
          .where(and(eq(wallets.id, data.to_wallet_id!), eq(wallets.userId, userId)))
          .limit(1)

        if (!to) throw new Error('WALLET_NOT_FOUND')
        // Same reasoning as the source wallet: an archived destination is
        // invisible in Total Saldo, so the money would simply disappear.
        if (isArchivedWallet(to)) throw new Error('WALLET_ARCHIVED')
      }

      const txId = crypto.randomUUID()
      await tx.insert(transactions).values({
        id: txId,
        userId,
        walletId: data.wallet_id,
        toWalletId: data.to_wallet_id ?? null,
        clientMutationId: data.client_mutation_id ?? null,
        type: data.type,
        amount: data.amount,
        title: data.title,
        categoryTag: data.category_tag ?? null,
        note: data.note ?? null,
        occurredAt: data.occurred_at ? new Date(data.occurred_at) : new Date(),
      })

      // 4. Update balance atomically.
      //
      //    CRITICAL: use `balance = balance ± amount`, never
      //    `balance = <value we just read>`. The read-modify-write form is a
      //    lost-update race — two concurrent expenses both read the same
      //    starting balance and the second overwrites the first, silently
      //    destroying money. Proven by scripts/test-concurrency.js: 10
      //    concurrent Rp 1.000 withdrawals from Rp 10.000 left Rp 8.000
      //    instead of Rp 0. The atomic form leaves Rp 0.
      if (data.type === 'income') {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${data.amount}` })
          .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId), eq(wallets.isArchived, 0)))
      } else if (data.type === 'expense') {
        const debit = await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${data.amount}` })
          .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId), eq(wallets.isArchived, 0), gte(wallets.balance, data.amount)))
        if (!debit[0].affectedRows) throw new Error('INSUFFICIENT_BALANCE')
      } else {
        // transfer: deduct source, credit destination — both atomically
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

      // `insertId` is only meaningful for auto-increment keys; our PK is a
      // client-generated UUID, so it would return 0 here.
      return txId
    })

    revalidatePath('/')
    revalidatePath('/wallets')
      // Detail pages for both legs of a transfer must refresh too, or the
      // balances shown there go stale.
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

      // NOTE: deliberately NOT blocked when w.isArchived is true. Unlike the
      // create paths, this REVERSES an existing transaction. Refusing would
      // strand money: a user who archived a wallet could never delete its old
      // transactions, leaving the balance permanently frozen. Reversal must
      // always be possible. test-archived-coverage.js asserts this exemption
      // explicitly rather than leaving it implicit.
      if (!w) throw new Error('WALLET_NOT_FOUND')

      // Reverse the original effect — atomic, same lost-update reasoning.
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

      await tx.delete(transactions).where(eq(transactions.id, id))
    })

    revalidatePath('/')
    revalidatePath('/wallets')
    // The delete button lives on the wallet detail page, so that route must
    // be revalidated too — otherwise the row stays visible after deletion.
    if (affectedWalletId) revalidatePath(`/wallets/${affectedWalletId}`)
    if (affectedToWalletId) revalidatePath(`/wallets/${affectedToWalletId}`)
    return { success: true, data: null }
  } catch (e) {
    console.error('[deleteTransaction]', e instanceof Error ? e.message : e)
    return { success: false, error: { code: 'UNKNOWN', message: 'Gagal menghapus transaksi.' } }
  }
}

/** FR-TXN-4: edit a transaction, recomputing wallet balances atomically.
 *
 * Editable: amount, title, category, note, source wallet (income/expense
 * only). TYPE is immutable — for a transfer, the wallet pair stays fixed and
 * only amount/title/category/note change, because changing one leg of a
 * transfer is ambiguous. Date editing is a documented follow-up.
 *
 * Balance logic (one transaction): reverse the old effect exactly like
 * deleteTransaction (reversal allowed even on archived wallets), then apply
 * the new effect. New-source wallets must be owned + active (same guard as
 * createTransaction), and an expense/transfer must not overdraw the
 * post-reversal balance.
 */
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

              // Type is immutable on edit — a transfer's wallet pair defines its
              // meaning and cannot be silently turned into a single-wallet row.
              if (data.type !== txRow.type) throw new Error('TYPE_IMMUTABLE')

      // Old effect (whatever the current row says) — immutable type.
      const oldWallet = txRow.walletId
      const oldTo = txRow.toWalletId as string | null
      affectedWalletId = oldWallet
      affectedToWalletId = oldTo

      // 1. Reverse old effect (reversal always allowed, even archived).
      if (txRow.type === 'income') {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${txRow.amount}` }).where(eq(wallets.id, oldWallet))
      } else if (txRow.type === 'expense') {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${txRow.amount}` }).where(eq(wallets.id, oldWallet))
      } else if (oldTo) {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${txRow.amount}` }).where(eq(wallets.id, oldWallet))
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${txRow.amount}` }).where(eq(wallets.id, oldTo))
      }

      // 2. Decide the NEW wallet(s). For transfers the pair is fixed.
      const isTransfer = txRow.type === 'transfer'
      const newSource = isTransfer ? oldWallet : data.wallet_id
      const newTo = isTransfer ? oldTo : (data.type === 'transfer' ? data.to_wallet_id ?? null : null)

      // 3. New wallets must be owned + active (create-style guard).
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

      // 4. Insufficient check on the post-reversal source balance.
      const type = txRow.type as string
      if (type !== 'income') {
        const [b] = await tx.select({ balance: wallets.balance }).from(wallets).where(eq(wallets.id, newSource)).limit(1)
        if (!b || Number(b.balance) < data.amount) throw new Error('INSUFFICIENT_BALANCE')
      }

      // 5. Apply new effect (same type as the old row).
      if (type === 'income') {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${data.amount}` }).where(eq(wallets.id, newSource))
      } else if (type === 'expense') {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${data.amount}` }).where(eq(wallets.id, newSource))
      } else if (newTo) {
        await tx.update(wallets).set({ balance: sql`${wallets.balance} - ${data.amount}` }).where(eq(wallets.id, newSource))
        await tx.update(wallets).set({ balance: sql`${wallets.balance} + ${data.amount}` }).where(eq(wallets.id, newTo))
      }

      // 6. Persist the new fields (type never changes).
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

  return db
    .select()
    .from(debts)
    .where(eq(debts.userId, userId))
    .orderBy(desc(debts.createdAt))
}

/**
 * Vaults are REAL allocations, not virtual labels.
 *
 * Vault deposits physically leave wallet balances; spendable subtracts debts only.
 * If setting money aside did not reduce the wallet balance, that money
 * would be counted twice: once as "in the vault" and again as spendable
 * cash. So every deposit/withdrawal moves actual wallet balance.
 */

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
      // Archived wallets are invisible in Total Saldo, so moving money out of
      // one makes it vanish with no trace. Same guard as createTransaction.
      if (isArchivedWallet(w)) throw new Error('WALLET_ARCHIVED')
      if (Number(w.balance) < amt) throw new Error('INSUFFICIENT_BALANCE')

      const [v] = await tx
        .select({ id: vaults.id, targetAmount: vaults.targetAmount })
        .from(vaults)
        .where(and(eq(vaults.id, vaultId), eq(vaults.userId, userId)))
        .limit(1)
      if (!v) throw new Error('VAULT_NOT_FOUND')

      // Atomic — see the lost-update note on createTransaction.
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
      // Money arriving at an archived wallet is invisible in Total Saldo —
      // it would look like it disappeared even though the balance rose.
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

      // Dropping below target un-completes it.
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
  return { success: true, data: { id } }
}

/** Mark a debt fully settled. Scoped to the owner. */
/**
 * Mark a debt as fully paid, or record a PARTIAL payment (FR-DBT-3).
 *
 * amount defaults to the remaining balance, so the existing full-settle call
 * keeps working. A partial payment adds to paidAmount; when it reaches the
 * total the debt flips to paid. Setting paidAmount beyond amount is rejected
 * rather than silently clamped — a "paid 20k" that becomes 15k would mislead
 * the user about what actually happened.
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
  return { success: true, data: null }
}

/**
 * Same as getWallets() but INCLUDING archived ones.
 *
 * Needed so an archived wallet can be restored. getWallets() filters
 * isArchived=0, so an archive-only UI would be a one-way door: the wallet
 * disappears from every list with no way back.
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
 *
 * Archiving is reversible and preferred over deleting: the wallet keeps its
 * history, it just stops counting toward Total Saldo. Without this there was
 * no way at all to retire a wallet — the isArchived column existed and was
 * filtered on everywhere, but nothing could ever set it.
 *
 * Note: archiving a wallet with a NON-ZERO balance removes that money from
 * Total Saldo. That is the point of archiving (the wallet is out of use), but
 * it is surprising enough to warrant the caller confirming first.
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
    // Scoped to the owner — without the userId filter this would let any
    // signed-in user archive anyone's wallet.
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

/**
 * Home-screen aggregate: total balance + Safe Daily Spend inputs.
 *
 * Safe Daily Spend (PRD §6.7, authoritative):
 *   max(0, floor((liquid - vaultAllocations - upcomingDebts) / max(1, daysLeft)))
 */
export async function getDashboard() {
  const userId = await requireUserId()
  if (!userId) {
    return {
      totalBalance: 0,
      walletCount: 0,
      vaultAllocations: 0,
      upcomingDebts: 0,
      safeDailySpend: 0,
      daysLeft: 1,
      monthlyIncome: 0,
      monthlyExpense: 0,
    }
  }

  const [walletRows, vaultRows, debtRows] = await Promise.all([
    db
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(and(eq(wallets.userId, userId), eq(wallets.isArchived, 0))),
    db
      .select({ currentAmount: vaults.currentAmount })
      .from(vaults)
      .where(and(eq(vaults.userId, userId), eq(vaults.isCompleted, 0))),
    db
      .select({ amount: debts.amount, paidAmount: debts.paidAmount })
      .from(debts)
      .where(and(eq(debts.userId, userId), eq(debts.isPaid, 0))),
  ])

  // Month-to-date totals for the home summary.
  const now = new Date()
  const monthWindow = getMonthWindow(now)
  const monthStart = monthWindow.start
  const monthRows = await db
    .select({ type: transactions.type, amount: transactions.amount })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, monthStart),
      ),
    )

  let monthlyIncome = 0
  let monthlyExpense = 0
  for (const r of monthRows) {
    if (r.type === 'income') monthlyIncome += r.amount
    else if (r.type === 'expense') monthlyExpense += r.amount
  }

  const totalBalance = walletRows.reduce((s, w) => s + Number(w.balance ?? 0), 0)
  const vaultAllocations = vaultRows.reduce((s, v) => s + Number(v.currentAmount ?? 0), 0)
  const upcomingDebts = debtRows.reduce(
    (s, d) => s + Math.max(0, Number(d.amount ?? 0) - Number(d.paidAmount ?? 0)),
    0,
  )

  const daysLeft = monthWindow.daysLeft
  // Vault deposits already reduce wallet balances, so subtracting them again
  // would double-count reserved money. Only outstanding debts remain.
  const spendable = totalBalance - upcomingDebts
  const safeDailySpend = Math.max(0, Math.floor(spendable / Math.max(1, daysLeft)))

  return {
    totalBalance,
    walletCount: walletRows.length,
    vaultAllocations,
    upcomingDebts,
    safeDailySpend,
    daysLeft,
    monthlyIncome,
    monthlyExpense,
  }
}

/** Last 7 days of expenses, zero-filled so the chart has no gaps. */
export async function getSpendingFlow() {
  const userId = await requireUserId()
  if (!userId) return []

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)

  const rows = await db
    .select({ amount: transactions.amount, occurredAt: transactions.occurredAt })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        gte(transactions.occurredAt, start),
      ),
    )

  const buckets = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    buckets.set(d.toDateString(), 0)
  }
  for (const r of rows) {
    const k = new Date(r.occurredAt).toDateString()
    if (buckets.has(k)) buckets.set(k, buckets.get(k)! + Number(r.amount ?? 0))
  }

  return [...buckets.entries()].map(([day, total]) => ({
    day: new Date(day),
    total,
  }))
}

/** Top spending categories for the current month. */
export async function getTopCategories(limit = 5) {
  const userId = await requireUserId()
  if (!userId) return []

  const now = new Date()
  const monthStart = getMonthWindow(now).start

  const rows = await db
    .select({ categoryTag: transactions.categoryTag, amount: transactions.amount })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        gte(transactions.occurredAt, monthStart),
      ),
    )

  const sums = new Map<string, number>()
  for (const r of rows) {
    const k = r.categoryTag ?? 'LAINNYA'
    sums.set(k, (sums.get(k) ?? 0) + Number(r.amount ?? 0))
  }

  const total = [...sums.values()].reduce((a, b) => a + b, 0) || 1
  return [...sums.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, amount]) => ({ category, amount, share: amount / total }))
}
