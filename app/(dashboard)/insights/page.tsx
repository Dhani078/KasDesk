import Link from 'next/link'
import { ArrowLeft, BarChart3, CalendarDays, Landmark, Sparkles, TrendingDown } from 'lucide-react'
import { auth } from '@/auth'
import { getDebts, getSpendingFlow, getTopCategories } from '@/lib/actions'
import { getDashboardSummary } from '@/lib/analytics/actions'
import { formatIDR, formatDateShort } from '@/lib/format'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import { EmptyState } from '@/components/EmptyState'
import { getMonthWindow } from '@/lib/timezone'
import { MonthlyRecapModal } from '@/components/MonthlyRecapModal'
import { FinancialHealthScoreCard } from '@/components/FinancialHealthScoreCard'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const [session, dash, flow, top, debts] = await Promise.all([
    auth(),
    getDashboardSummary(),
    getSpendingFlow(),
    getTopCategories(7),
    getDebts(),
  ])
  const { month } = getMonthWindow()
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Kawan'
  const weeklyTotal = flow.reduce((sum, item) => sum + item.total, 0)
  const activeDays = flow.filter((item) => item.total > 0).length
  const dailyAverage = activeDays ? Math.round(weeklyTotal / activeDays) : 0
  const maxFlow = Math.max(1, ...flow.map((item) => item.total))
  const openDebts = debts.filter((debt) => !debt.isPaid)
  const debtTotal = openDebts.reduce((sum, debt) => sum + Math.max(0, Number(debt.amount) - Number(debt.paidAmount)), 0)

  const recapData = {
    monthName: month,
    userName,
    monthlyIncome: dash.monthlyIncome,
    monthlyExpense: dash.monthlyExpense,
    netSavings: dash.monthlyIncome - dash.monthlyExpense,
    savingsRate: dash.savingsRate,
    healthScore: dash.healthScore,
    healthLabel: dash.healthLabel,
    safeDailySpend: dash.safeDailySpend,
    topCategories: top,
    debtTotal,
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12">
      <Link href="/" className="back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>
      <header className="mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Analisis</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Laporan keuangan</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Ringkasan yang membantu melihat pola, bukan sekadar angka.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href="/coach" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95">
              <Sparkles className="h-4 w-4" aria-hidden /> Tanya AI Coach
            </Link>
            <Link href="/planning" className="inline-flex min-h-11 items-center rounded-xl border border-border-outer px-4 text-sm text-accent transition hover:border-accent/40">
              Atur budget & pengingat
            </Link>
            <MonthlyRecapModal data={recapData} />
          </div>
        </div>
      </header>

      <FinancialHealthScoreCard dash={dash} />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan laporan">
        <article className="surface-card rounded-2xl p-4"><TrendingDown className="h-4 w-4 text-accent-expense" aria-hidden /><p className="mt-3 text-xs text-text-secondary">7 hari</p><p className="mt-1 font-mono text-base font-semibold sm:text-lg"><PrivacyAmount value={weeklyTotal} /></p></article>
        <article className="surface-card rounded-2xl p-4"><CalendarDays className="h-4 w-4 text-accent" aria-hidden /><p className="mt-3 text-xs text-text-secondary">Rata-rata aktif</p><p className="mt-1 font-mono text-base font-semibold sm:text-lg"><PrivacyAmount value={dailyAverage} /></p></article>
        <article className="surface-card rounded-2xl p-4"><BarChart3 className="h-4 w-4 text-accent-income" aria-hidden /><p className="mt-3 text-xs text-text-secondary">Kategori utama</p><p className="mt-1 truncate text-base font-semibold sm:text-lg">{top[0]?.category ?? '—'}</p></article>
        <article className="surface-card rounded-2xl p-4"><Landmark className="h-4 w-4 text-accent-expense" aria-hidden /><p className="mt-3 text-xs text-text-secondary">Utang/piutang aktif</p><p className="mt-1 font-mono text-base font-semibold sm:text-lg"><PrivacyAmount value={debtTotal} /></p></article>
      </section>

      <section className="surface-card mb-6 rounded-2xl p-5">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-sm font-semibold">7 Hari Terakhir</h2><p className="mt-1 text-xs text-text-secondary">Sentuh batang untuk melihat nominal</p></div><p className="font-mono text-lg font-semibold"><PrivacyAmount value={weeklyTotal} /></p></div>
        <div className="mt-6 flex h-40 items-end gap-2" role="img" aria-label="Grafik pengeluaran tujuh hari terakhir">
          {flow.map((item, i) => <div key={item.day.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-2 animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}><div className="flex h-28 w-full items-end rounded-lg bg-white/[0.025] p-1"><div className="group/bar relative w-full cursor-pointer rounded-md bg-gradient-to-t from-accent-solid to-accent transition-all duration-300 hover:brightness-125 hover:shadow-[0_0_16px_rgba(79,127,232,.35)] active:scale-x-110" style={{ height: `${Math.max(4, (item.total / maxFlow) * 100)}%` }} title={`${formatDateShort(item.day)}: ${formatIDR(item.total)}`}><span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-mono text-accent opacity-0 shadow-md transition-opacity group-hover/bar:opacity-100 border border-border-outer">{formatIDR(item.total)}</span></div></div><span className="text-xs text-text-secondary">{formatDateShort(item.day).split(' ')[0]}</span></div>)}
        </div>
        <details className="mt-5 border-t border-border-inner pt-4"><summary className="cursor-pointer rounded-lg text-sm font-medium text-accent">Lihat data sebagai daftar</summary><ul className="mt-3 divide-y divide-border-inner text-sm">{flow.map((item)=><li key={`detail-${item.day.toISOString()}`} className="flex justify-between gap-4 py-3"><span>{formatDateShort(item.day)}</span><span className="font-mono text-text-secondary"><PrivacyAmount value={item.total} /></span></li>)}</ul></details>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="mb-3 text-sm font-semibold">Kategori Terbesar</h2>{top.length === 0 ? <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="Belum ada pengeluaran" body="Laporan muncul setelah transaksi pertama." /> : <ul className="surface-card space-y-4 rounded-2xl p-5">{top.map((item)=><li key={item.category}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{item.category}</span><span className="font-mono text-text-secondary"><PrivacyAmount value={item.amount} /></span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-accent" style={{width:`${Math.max(2,Math.round(item.share*100))}%`}} /></div></li>)}</ul>}</section>
        <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Utang dan piutang aktif</h2><Link href="/debts" className="text-xs font-semibold text-accent hover:underline">Kelola &rarr;</Link></div>{openDebts.length === 0 ? <div className="rounded-2xl border border-dashed border-border-outer p-6 text-center text-sm text-text-secondary">Tidak ada kewajiban berjalan.</div> : <ul className="surface-card divide-y divide-border-inner overflow-hidden rounded-2xl">{openDebts.map((debt)=>{const remaining=Math.max(0,Number(debt.amount)-Number(debt.paidAmount));const positive=debt.direction==='piutang';return <li key={debt.id} className="flex items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{debt.personName}</p><p className="mt-1 text-xs text-text-secondary">{positive?'Piutang':'Utang'}{debt.dueDate?` · ${formatDateShort(debt.dueDate)}`:''}</p></div><span className={`font-mono text-sm ${positive?'text-accent-income':'text-accent-expense'}`}><PrivacyAmount value={remaining} /></span></li>})}</ul>}</section>
      </div>
    </main>
  )
}
