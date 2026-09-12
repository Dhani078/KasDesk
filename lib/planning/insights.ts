import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { budgets, transactions } from '@/lib/db/schema'
import { getMonthWindow } from '@/lib/timezone'

export type BudgetAlert = {
  category: string
  budget: number
  spent: number
  remaining: number
  percent: number
  status: 'safe' | 'watch' | 'danger'
}

function n(value: unknown): number {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

export async function getBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
  const { month, start, end } = getMonthWindow()
  const rows = await db
    .select({
      category: budgets.categoryTag,
      budget: budgets.amount,
      spent: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(budgets)
    .leftJoin(
      transactions,
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        eq(transactions.categoryTag, budgets.categoryTag),
        gte(transactions.occurredAt, start),
        lt(transactions.occurredAt, end),
      ),
    )
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)))
    .groupBy(budgets.id, budgets.categoryTag, budgets.amount)

  return rows
    .map((row) => {
      const budget = n(row.budget)
      const spent = n(row.spent)
      const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0
      return {
        category: row.category,
        budget,
        spent,
        remaining: Math.max(0, budget - spent),
        percent,
        status: percent >= 100 ? 'danger' : percent >= 80 ? 'watch' : 'safe',
      } satisfies BudgetAlert
    })
    .sort((a, b) => b.percent - a.percent)
}
