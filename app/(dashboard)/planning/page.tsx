import Link from 'next/link'
import { ArrowLeft, CalendarClock, PiggyBank, Target, Trash2 } from 'lucide-react'
import { and, asc, eq, gte, lt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { budgets, recurringRules, transactions } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { formatIDR, formatDateShort } from '@/lib/format'
import { deleteBudget, deleteRecurring, toggleRecurring } from '@/lib/planning/actions'
import { BudgetForm, RecurringForm } from '@/components/PlanningForms'
import { getMonthWindow } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

export default async function PlanningPage() {
  const userId = await requireUserId()
  if (!userId) return null
  const { month, start, end } = getMonthWindow()
  const [budgetRows, expenseRows, rules] = await Promise.all([
    db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month))),
    db.select({ category: transactions.categoryTag, amount: transactions.amount }).from(transactions).where(and(eq(transactions.userId, userId), eq(transactions.type, 'expense'), gte(transactions.occurredAt, start), lt(transactions.occurredAt, end))),
    db.select().from(recurringRules).where(eq(recurringRules.userId, userId)).orderBy(asc(recurringRules.nextRunAt)),
  ])
  const spent = new Map<string, number>()
  for (const row of expenseRows) spent.set(row.category ?? 'LAINNYA', (spent.get(row.category ?? 'LAINNYA') ?? 0) + Number(row.amount))
  const totalBudget = budgetRows.reduce((sum, row) => sum + Number(row.amount), 0)
  const totalSpent = budgetRows.reduce((sum, row) => sum + (spent.get(row.categoryTag) ?? 0), 0)
  const remaining = Math.max(0, totalBudget - totalSpent)

  return <main className="page-shell max-w-3xl">
    <Link href="/insights" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden /> Laporan</Link>
    <header className="page-header"><div><p className="eyebrow">Rencana</p><h1>Budget & pengingat</h1><p>Buat batas yang realistis dan jangan lewatkan pembayaran penting.</p></div><span className="icon-tile"><PiggyBank className="h-5 w-5" aria-hidden /></span></header>

    <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3"><article className="surface-card rounded-2xl p-4"><p className="text-xs text-text-secondary">Total budget</p><p className="mt-2 font-mono font-semibold">{formatIDR(totalBudget)}</p></article><article className="surface-card rounded-2xl p-4"><p className="text-xs text-text-secondary">Terpakai</p><p className="mt-2 font-mono font-semibold text-accent-expense">{formatIDR(totalSpent)}</p></article><article className="surface-card col-span-2 rounded-2xl p-4 sm:col-span-1"><p className="text-xs text-text-secondary">Tersisa</p><p className="mt-2 font-mono font-semibold text-accent-income">{formatIDR(remaining)}</p></article></section>

    <section className="mb-10"><div className="section-heading"><div><h2><Target className="h-5 w-5 text-accent" aria-hidden /> Budget bulan ini</h2><p>Pengeluaran dihitung otomatis dari transaksi {month}.</p></div></div><BudgetForm month={month} categories={CATEGORY_ENUM.filter((category) => category !== 'GAJI')} />
      {budgetRows.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{budgetRows.map((budget) => {const used = spent.get(budget.categoryTag) ?? 0; const raw = Math.round(used / Number(budget.amount) * 100); const percent = Math.min(100, raw); return <article key={budget.id} className="surface-card rounded-3xl p-5"><div className="flex items-start justify-between gap-3"><div><span className={`status-pill ${raw >= 100 ? 'danger' : ''}`}>{raw >= 100 ? 'Batas tercapai' : `${raw}% terpakai`}</span><h3 className="mt-3 font-semibold">{budget.categoryTag}</h3><p className="mt-1 text-sm text-text-secondary">{formatIDR(used)} dari {formatIDR(budget.amount)}</p></div><form action={deleteBudget}><input type="hidden" name="id" value={budget.id}/><button aria-label={`Hapus budget ${budget.categoryTag}`} className="icon-button danger"><Trash2 className="h-4 w-4" aria-hidden /></button></form></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className={`h-full rounded-full transition-all ${raw >= 100 ? 'bg-danger' : 'bg-accent'}`} style={{width:`${percent}%`}}/></div></article>})}</div> : <div className="empty-panel mt-4"><Target className="h-6 w-6 text-accent" aria-hidden /><h3>Belum ada budget</h3><p>Mulai dari satu kategori yang paling sering digunakan.</p></div>}
    </section>

    <section><div className="section-heading"><div><h2><CalendarClock className="h-5 w-5 text-accent" aria-hidden /> Pengingat rutin</h2><p>Untuk tagihan, langganan, gaji, dan kebutuhan berkala.</p></div></div><RecurringForm categories={CATEGORY_ENUM} />
      {rules.length ? <ul className="surface-card mt-4 divide-y divide-border-inner overflow-hidden rounded-3xl">{rules.map((rule) => <li key={rule.id} className="setting-row"><span className="icon-tile"><CalendarClock className="h-5 w-5" aria-hidden /></span><div className="min-w-0 flex-1"><p className="font-medium">{rule.title}</p><p className="mt-1 text-xs text-text-secondary">{rule.frequency === 'monthly' ? 'Bulanan' : 'Mingguan'} · {formatDateShort(rule.nextRunAt)} · {formatIDR(rule.amount)}</p></div><form action={toggleRecurring}><input type="hidden" name="id" value={rule.id}/><button aria-label={rule.isActive ? `Nonaktifkan ${rule.title}` : `Aktifkan ${rule.title}`} className="secondary-button">{rule.isActive ? 'Aktif' : 'Nonaktif'}</button></form><form action={deleteRecurring}><input type="hidden" name="id" value={rule.id}/><button aria-label={`Hapus ${rule.title}`} className="icon-button danger"><Trash2 className="h-4 w-4" aria-hidden /></button></form></li>)}</ul> : <div className="empty-panel mt-4"><CalendarClock className="h-6 w-6 text-accent" aria-hidden /><h3>Belum ada pengingat</h3><p>Tambahkan tagihan yang tidak boleh terlambat.</p></div>}
    </section>
  </main>
}
