import Link from 'next/link'
import { BarChart3, CalendarDays, Landmark, ShieldCheck, TrendingDown } from 'lucide-react'
import { getDebts } from '@/lib/actions'
import { getDashboardSummary, getSpendingFlowSummary, getTopCategorySummary } from '@/lib/analytics/actions'
import { formatIDR, formatDateShort } from '@/lib/format'
import { EmptyState } from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const [dash, flow, top, debts] = await Promise.all([getDashboardSummary(), getSpendingFlowSummary(), getTopCategorySummary(7), getDebts()])
  const weeklyTotal = flow.reduce((sum, item) => sum + item.total, 0)
  const activeDays = flow.filter((item) => item.total > 0).length
  const dailyAverage = activeDays ? Math.round(weeklyTotal / activeDays) : 0
  const maxFlow = Math.max(1, ...flow.map((item) => item.total))
  const openDebts = debts.filter((debt) => !debt.isPaid)
  const debtTotal = openDebts.reduce((sum, debt) => sum + Math.max(0, Number(debt.amount) - Number(debt.paidAmount)), 0)

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-32 pt-8 sm:px-8 sm:pt-12">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Analisis</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">Laporan keuangan</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">Ringkasan yang membantu melihat pola, bukan sekadar angka.</p>
        <Link href="/planning" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-border-outer px-4 text-sm text-accent">Atur budget & pengingat</Link>
      </header>

      <section className="surface-card mb-6 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="icon-tile"><ShieldCheck className="h-5 w-5" aria-hidden /></span>
            <div><p className="text-xs uppercase tracking-[0.08em] text-text-secondary">Financial health</p><h2 className="mt-1 text-xl font-semibold">{dash.healthLabel} · {dash.healthScore}/100</h2></div>
          </div>
          <span className="status-pill">Savings {dash.savingsRate}%</span>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-text-secondary sm:grid-cols-3">
          {(dash.healthTips.length ? dash.healthTips : ['Pertahankan catatan harian.', 'Review budget setiap minggu.', 'Naikkan target tabungan bertahap.']).map((tip) => <li key={tip} className="rounded-xl bg-white/[0.035] p-3">{tip}</li>)}
        </ul>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan laporan">
        <article className="surface-card rounded-2xl p-4"><TrendingDown className="h-4 w-4 text-accent-expense" aria-hidden /><p className="mt-3 text-xs text-text-secondary">7 hari</p><p className="mt-1 font-mono text-base font-semibold sm:text-lg">{formatIDR(weeklyTotal)}</p></article>
        <article className="surface-card rounded-2xl p-4"><CalendarDays className="h-4 w-4 text-accent" aria-hidden /><p className="mt-3 text-xs text-text-secondary">Rata-rata aktif</p><p className="mt-1 font-mono text-base font-semibold sm:text-lg">{formatIDR(dailyAverage)}</p></article>
        <article className="surface-card rounded-2xl p-4"><BarChart3 className="h-4 w-4 text-accent-income" aria-hidden /><p className="mt-3 text-xs text-text-secondary">Kategori utama</p><p className="mt-1 truncate text-base font-semibold sm:text-lg">{top[0]?.category ?? '—'}</p></article>
        <article className="surface-card rounded-2xl p-4"><Landmark className="h-4 w-4 text-accent-expense" aria-hidden /><p className="mt-3 text-xs text-text-secondary">Utang/piutang aktif</p><p className="mt-1 font-mono text-base font-semibold sm:text-lg">{formatIDR(debtTotal)}</p></article>
      </section>

      <section className="surface-card mb-6 rounded-2xl p-5">
        <div className="flex items-end justify-between gap-4"><div><h2 className="text-sm font-semibold">7 Hari Terakhir</h2><p className="mt-1 text-xs text-text-secondary">Sentuh batang untuk melihat nominal</p></div><p className="font-mono text-lg font-semibold">{formatIDR(weeklyTotal)}</p></div>
        <div className="mt-6 flex h-40 items-end gap-2" role="img" aria-label="Grafik pengeluaran tujuh hari terakhir">
          {flow.map((item) => <div key={item.day.toISOString()} className="flex min-w-0 flex-1 flex-col items-center gap-2"><div className="flex h-28 w-full items-end rounded-lg bg-white/[0.025] p-1"><div className="w-full rounded-md bg-gradient-to-t from-accent-solid to-accent transition-opacity hover:opacity-80" style={{ height: `${Math.max(4, (item.total / maxFlow) * 100)}%` }} title={`${formatDateShort(item.day)}: ${formatIDR(item.total)}`} /></div><span className="text-xs text-text-secondary">{formatDateShort(item.day).split(' ')[0]}</span></div>)}
        </div>
        <details className="mt-5 border-t border-border-inner pt-4"><summary className="cursor-pointer rounded-lg text-sm font-medium text-accent">Lihat data sebagai daftar</summary><ul className="mt-3 divide-y divide-border-inner text-sm">{flow.map((item)=><li key={`detail-${item.day.toISOString()}`} className="flex justify-between gap-4 py-3"><span>{formatDateShort(item.day)}</span><span className="font-mono text-text-secondary">{formatIDR(item.total)}</span></li>)}</ul></details>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="mb-3 text-sm font-semibold">Kategori Terbesar</h2>{top.length === 0 ? <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="Belum ada pengeluaran" body="Laporan muncul setelah transaksi pertama." /> : <ul className="surface-card space-y-4 rounded-2xl p-5">{top.map((item)=><li key={item.category}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{item.category}</span><span className="font-mono text-text-secondary">{formatIDR(item.amount)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-accent" style={{width:`${Math.max(2,Math.round(item.share*100))}%`}} /></div></li>)}</ul>}</section>
        <section><h2 className="mb-3 text-sm font-semibold">Utang dan piutang aktif</h2>{openDebts.length === 0 ? <div className="rounded-2xl border border-dashed border-border-outer p-6 text-center text-sm text-text-secondary">Tidak ada kewajiban berjalan.</div> : <ul className="surface-card divide-y divide-border-inner overflow-hidden rounded-2xl">{openDebts.map((debt)=>{const remaining=Math.max(0,Number(debt.amount)-Number(debt.paidAmount));const positive=debt.direction==='piutang';return <li key={debt.id} className="flex items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{debt.personName}</p><p className="mt-1 text-xs text-text-secondary">{positive?'Piutang':'Utang'}{debt.dueDate?` · ${formatDateShort(debt.dueDate)}`:''}</p></div><span className={`font-mono text-sm ${positive?'text-accent-income':'text-accent-expense'}`}>{formatIDR(remaining)}</span></li>})}</ul>}</section>
      </div>
    </main>
  )
}
