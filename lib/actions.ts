'use server'

import { revalidatePath } from 'next/cache'
import { eq, and, desc, gte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { wallets, transactions, categories, vaults, debts } from '@/lib/db/schema'
import { TransactionSchema, WalletSchema } from '@/lib/schemas'
import { requireUserId } from '@/lib/auth/session'
import { daysLeftInMonth } from '@/lib/format'
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

      const txId = crypto.randomUUID()
      await tx.insert(transactions).values({
        id: txId,
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
          .where(eq(wallets.id, data.wallet_id))
      } else if (data.type === 'expense') {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${data.amount}` })
          .where(eq(wallets.id, data.wallet_id))
      } else {
        // transfer: deduct source, credit destination — both atomically
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} - ${data.amount}` })
          .where(eq(wallets.id, data.wallet_id))
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${data.amount}` })
          .where(eq(wallets.id, data.to_wallet_id!))
      }

      // `insertId` is only meaningful for auto-increment keys; our PK is a
      // client-generated UUID, so it would return 0 here.
      return txId
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

  return db
    .select()
    .from(debts)
    .where(eq(debts.userId, userId))
    .orderBy(desc(debts.createdAt))
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
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

  const daysLeft = daysLeftInMonth(now)
  const spendable = totalBalance - vaultAllocations - upcomingDebts
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

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
