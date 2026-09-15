import { and, eq, gte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { wallets, vaults, debts, transactions } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { getMonthWindow } from '@/lib/timezone'

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
