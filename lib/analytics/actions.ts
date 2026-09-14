'use server'

import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { debts, transactions, vaults, wallets } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { getMonthWindow } from '@/lib/timezone'

export type DashboardSummary = {
  totalBalance: number
  walletCount: number
  vaultAllocations: number
  upcomingDebts: number
  safeDailySpend: number
  daysLeft: number
  monthlyIncome: number
  monthlyExpense: number
  savingsRate: number
  healthScore: number
  healthLabel: string
  healthTips: string[]
}

function n(value: unknown): number {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

function buildHealthScore(input: {
  totalBalance: number
  vaultAllocations: number
  upcomingDebts: number
  monthlyIncome: number
  monthlyExpense: number
  daysLeft: number
}): Pick<DashboardSummary, 'healthScore' | 'healthLabel' | 'healthTips' | 'savingsRate'> {
  const { totalBalance, vaultAllocations, upcomingDebts, monthlyIncome, monthlyExpense, daysLeft } = input
  const netMonth = monthlyIncome - monthlyExpense
  const savingsRate = monthlyIncome > 0 ? Math.round((netMonth / monthlyIncome) * 100) : 0
  let score = 55
  const tips: string[] = []

  if (totalBalance > 0) score += 10
  else tips.push('Buat saldo awal di dompet utama agar laporan lebih akurat.')

  if (monthlyIncome > 0) score += 10
  else tips.push('Catat pemasukan rutin supaya Aman Harian lebih realistis.')

  if (monthlyExpense <= monthlyIncome || monthlyIncome === 0) score += 10
  else tips.push('Pengeluaran bulan ini melewati pemasukan; cek kategori terbesar.')

  if (vaultAllocations > 0) score += 10
  else tips.push('Buat minimal satu target tabungan untuk dana darurat atau tujuan besar.')

  if (upcomingDebts === 0) score += 8
  else if (upcomingDebts < Math.max(1, totalBalance) * 0.35) score += 4
  else tips.push('Utang/piutang aktif cukup besar; prioritaskan pembayaran terdekat.')

  if (daysLeft > 0 && totalBalance - vaultAllocations - upcomingDebts > 0) score += 7
  else tips.push('Aman Harian sedang ketat; tahan pengeluaran non-prioritas dulu.')

  score = Math.max(0, Math.min(100, score))
  const healthLabel = score >= 85 ? 'Sangat sehat' : score >= 70 ? 'Sehat' : score >= 55 ? 'Perlu dijaga' : 'Rawan bocor'
  return { healthScore: score, healthLabel, healthTips: tips.slice(0, 3), savingsRate }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const userId = await requireUserId()
  const monthWindow = getMonthWindow()
  if (!userId) {
    return {
      totalBalance: 0,
      walletCount: 0,
      vaultAllocations: 0,
      upcomingDebts: 0,
      safeDailySpend: 0,
      daysLeft: monthWindow.daysLeft,
      monthlyIncome: 0,
      monthlyExpense: 0,
      savingsRate: 0,
      healthScore: 0,
      healthLabel: 'Belum ada data',
      healthTips: ['Masuk ulang lalu buat dompet pertama.'],
    }
  }

  const [walletAgg, vaultAgg, debtAgg, monthAgg] = await Promise.all([
    db.select({
      totalBalance: sql<number>`coalesce(sum(${wallets.balance}), 0)`,
      walletCount: sql<number>`count(*)`,
    }).from(wallets).where(and(eq(wallets.userId, userId), eq(wallets.isArchived, 0))),
    db.select({
      vaultAllocations: sql<number>`coalesce(sum(${vaults.currentAmount}), 0)`,
    }).from(vaults).where(and(eq(vaults.userId, userId), eq(vaults.isCompleted, 0))),
    db.select({
      upcomingDebts: sql<number>`coalesce(sum(greatest(${debts.amount} - ${debts.paidAmount}, 0)), 0)`,
    }).from(debts).where(and(eq(debts.userId, userId), eq(debts.isPaid, 0))),
    db.select({
      monthlyIncome: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      monthlyExpense: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    }).from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, monthWindow.start), lt(transactions.occurredAt, monthWindow.end))),
  ])

  const totalBalance = n(walletAgg[0]?.totalBalance)
  const walletCount = n(walletAgg[0]?.walletCount)
  const vaultAllocations = n(vaultAgg[0]?.vaultAllocations)
  const upcomingDebts = n(debtAgg[0]?.upcomingDebts)
  const monthlyIncome = n(monthAgg[0]?.monthlyIncome)
  const monthlyExpense = n(monthAgg[0]?.monthlyExpense)
  const daysLeft = monthWindow.daysLeft
  const spendable = totalBalance - vaultAllocations - upcomingDebts
  const safeDailySpend = Math.max(0, Math.floor(spendable / Math.max(1, daysLeft)))
  const health = buildHealthScore({ totalBalance, vaultAllocations, upcomingDebts, monthlyIncome, monthlyExpense, daysLeft })

  return {
    totalBalance,
    walletCount,
    vaultAllocations,
    upcomingDebts,
    safeDailySpend,
    daysLeft,
    monthlyIncome,
    monthlyExpense,
    ...health,
  }
}

export async function getSpendingFlowSummary() {
  const userId = await requireUserId()
  if (!userId) return []

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 6)

  const rows = await db
    .select({
      day: sql<string>`date(${transactions.occurredAt})`,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense'), gte(transactions.occurredAt, start)))
    .groupBy(sql`date(${transactions.occurredAt})`)
    .orderBy(sql`date(${transactions.occurredAt})`)

  const buckets = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    buckets.set(d.toISOString().slice(0, 10), 0)
  }
  for (const row of rows) {
    if (row.day) buckets.set(String(row.day), n(row.total))
  }
  return [...buckets.entries()].map(([day, total]) => ({ day: new Date(`${day}T00:00:00`), total }))
}

export async function getTopCategorySummary(limit = 7) {
  const userId = await requireUserId()
  if (!userId) return []
  const monthWindow = getMonthWindow()
  const rows = await db
    .select({
      category: sql<string>`coalesce(${transactions.categoryTag}, 'LAINNYA')`,
      amount: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense'), gte(transactions.occurredAt, monthWindow.start), lt(transactions.occurredAt, monthWindow.end)))
    .groupBy(sql`coalesce(${transactions.categoryTag}, 'LAINNYA')`)
    .orderBy(desc(sql`sum(${transactions.amount})`))
    .limit(limit)

  const total = rows.reduce((sum, row) => sum + n(row.amount), 0) || 1
  return rows.map((row) => ({ category: row.category, amount: n(row.amount), share: n(row.amount) / total }))
}
