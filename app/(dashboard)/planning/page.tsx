import Link from 'next/link'
import { ArrowLeft, CalendarClock, CheckCircle2, PiggyBank, Target, Trash2, ShieldAlert } from 'lucide-react'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { budgets, recurringRules, wallets } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { formatIDR, formatDateShort } from '@/lib/format'
import { deleteBudget, deleteRecurring, toggleRecurring, executeRecurringAction } from '@/lib/planning/actions'
import { getBudgetAlerts } from '@/lib/planning/insights'
import { BudgetForm, RecurringForm } from '@/components/PlanningForms'
import { getMonthWindow } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

function getCountdown(nextRunAt: Date) {
  const now = new Date()
  const target = new Date(nextRunAt)
  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const targetZero = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diffDays = Math.round((targetZero - todayZero) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { label: `Terlewat ${Math.abs(diffDays)} hari`, cls: 'bg-danger/15 text-danger border-danger/30' }
  } else if (diffDays === 0) {
    return { label: 'Hari ini!', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/30 font-semibold animate-pulse' }
  } else if (diffDays === 1) {
    return { label: 'Besok', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
  } else if (diffDays <= 7) {
    return { label: `${diffDays} hari lagi`, cls: 'bg-accent/15 text-accent border-accent/30' }
  } else {
    return { label: `${diffDays} hari lagi`, cls: 'bg-white/[0.04] text-text-secondary border-border-outer' }
  }
}

export default async function PlanningPage() {
  const userId = await requireUserId()
  if (!userId) return null
  const { month } = getMonthWindow()
  const [budgetRows, alerts, rules, walletRows] = await Promise.all([
    db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month))),
    getBudgetAlerts(userId),
    db.select().from(recurringRules).where(eq(recurringRules.userId, userId)).orderBy(asc(recurringRules.nextRunAt)),
    db.select({ id: wallets.id, name: wallets.name }).from(wallets).where(and(eq(wallets.userId, userId), eq(wallets.isArchived, 0))),
  ])
  const alertMap = new Map(alerts.map((alert) => [alert.category, alert]))
  const totalBudget = alerts.reduce((sum, row) => sum + row.budget, 0)
  const totalSpent = alerts.reduce((sum, row) => sum + row.spent, 0)
  const remaining = Math.max(0, totalBudget - totalSpent)
  const warningAlerts = alerts.filter((alert) => alert.status !== 'safe')
  const totalRecurring = rules.filter((r) => r.isActive).reduce((sum, r) => sum + r.amount, 0)

  return <main className="page-shell max-w-3xl">
    <Link href="/insights" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden /> Laporan</Link>
    <header className="page-header"><div><p className="eyebrow">Rencana</p><h1>Budget & pengingat</h1><p>Buat batas yang realistis dan jangan lewatkan pembayaran penting.</p></div><span className="icon-tile"><PiggyBank className="h-5 w-5" aria-hidden /></span></header>

    {warningAlerts.length > 0 && <section className="mb-6 rounded-3xl border border-danger/25 bg-danger/5 p-5"><div className="flex gap-3"><ShieldAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden /><div><h2 className="font-semibold text-danger">Budget perlu perhatian</h2><p className="mt-1 text-sm text-text-secondary">{warningAlerts[0].category} sudah {warningAlerts[0].percent}% terpakai bulan ini.</p></div></div></section>}

    <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3"><article className="surface-card rounded-2xl p-4"><p className="text-xs text-text-secondary">Total budget</p><p className="mt-2 font-mono font-semibold">{formatIDR(totalBudget)}</p></article><article className="surface-card rounded-2xl p-4"><p className="text-xs text-text-secondary">Terpakai</p><p className="mt-2 font-mono font-semibold text-accent-expense">{formatIDR(totalSpent)}</p></article><article className="surface-card col-span-2 rounded-2xl p-4 sm:col-span-1"><p className="text-xs text-text-secondary">Tersisa</p><p className="mt-2 font-mono font-semibold text-accent-income">{formatIDR(remaining)}</p></article></section>

    <section className="mb-10"><div className="section-heading"><div><h2><Target className="h-5 w-5 text-accent" aria-hidden /> Budget bulan ini</h2><p>Pengeluaran dihitung otomatis dari transaksi {month}.</p></div></div><BudgetForm month={month} categories={CATEGORY_ENUM.filter((category) => category !== 'GAJI')} />
      {budgetRows.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{budgetRows.map((budget) => {const alert = alertMap.get(budget.categoryTag); const used = alert?.spent ?? 0; const raw = alert?.percent ?? 0; const percent = Math.min(100, raw); return <article key={budget.id} className="surface-card rounded-3xl p-5"><div className="flex items-start justify-between gap-3"><div><span className={`status-pill ${raw >= 100 ? 'danger' : ''}`}>{raw >= 100 ? 'Batas tercapai' : raw >= 80 ? `${raw}% · hati-hati` : `${raw}% terpakai`}</span><h3 className="mt-3 font-semibold">{budget.categoryTag}</h3><p className="mt-1 text-sm text-text-secondary">{formatIDR(used)} dari {formatIDR(budget.amount)}</p></div><form action={deleteBudget}><input type="hidden" name="id" value={budget.id}/><button aria-label={`Hapus budget ${budget.categoryTag}`} className="icon-button danger"><Trash2 className="h-4 w-4" aria-hidden /></button></form></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className={`h-full rounded-full transition-all ${raw >= 100 ? 'bg-danger' : raw >= 80 ? 'bg-accent-expense' : 'bg-accent'}`} style={{width:`${percent}%`}}/></div></article>})}</div> : <div className="empty-panel mt-4"><Target className="h-6 w-6 text-accent" aria-hidden /><h3>Belum ada budget</h3><p>Mulai dari satu kategori yang paling sering digunakan.</p></div>}
    </section>

    <section><div className="section-heading"><div><h2><CalendarClock className="h-5 w-5 text-accent" aria-hidden /> Pengingat & Langganan Rutin</h2><p>Untuk tagihan, langganan, dan pengeluaran berkala. Komitmen aktif: {formatIDR(totalRecurring)}</p></div></div><RecurringForm categories={CATEGORY_ENUM} />
      {rules.length ? <ul className="surface-card mt-4 divide-y divide-border-inner overflow-hidden rounded-3xl">{rules.map((rule) => {
        const countdown = getCountdown(rule.nextRunAt)
        return (
          <li key={rule.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="icon-tile shrink-0"><CalendarClock className="h-5 w-5" aria-hidden /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-primary truncate">{rule.title}</p>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${countdown.cls}`}>
                    {countdown.label}
                  </span>
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-text-secondary border border-border-outer">
                    {rule.frequency === 'monthly' ? 'Bulanan' : 'Mingguan'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  Jatuh tempo: {formatDateShort(rule.nextRunAt)} · <strong className="font-mono text-text-primary">{formatIDR(rule.amount)}</strong> ({rule.type === 'income' ? 'Pemasukan' : 'Pengeluaran'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {rule.isActive ? (
                <form action={executeRecurringAction}>
                  <input type="hidden" name="id" value={rule.id} />
                  {walletRows.length > 0 && <input type="hidden" name="walletId" value={walletRows[0].id} />}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 active:scale-95 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Catat Sekarang
                  </button>
                </form>
              ) : null}
              <form action={toggleRecurring}>
                <input type="hidden" name="id" value={rule.id} />
                <button aria-label={rule.isActive ? `Nonaktifkan ${rule.title}` : `Aktifkan ${rule.title}`} className="secondary-button text-xs py-1.5 px-2.5">
                  {rule.isActive ? 'Aktif' : 'Nonaktif'}
                </button>
              </form>
              <form action={deleteRecurring}>
                <input type="hidden" name="id" value={rule.id} />
                <button aria-label={`Hapus ${rule.title}`} className="icon-button danger">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </form>
            </div>
          </li>
        )
      })}</ul> : <div className="empty-panel mt-4"><CalendarClock className="h-6 w-6 text-accent" aria-hidden /><h3>Belum ada pengingat</h3><p>Tambahkan tagihan yang tidak boleh terlambat.</p></div>}
    </section>
  </main>
}
