import Link from 'next/link'
import { ArrowLeft, Lightbulb, PiggyBank, ShieldAlert, TrendingDown } from 'lucide-react'
import { getDashboardSummary, getSpendingFlowSummary, getTopCategorySummary } from '@/lib/analytics/actions'
import { formatIDR } from '@/lib/format'

export const dynamic = 'force-dynamic'

type Advice = { title: string; body: string; tone: 'good' | 'warn' | 'info' }

function buildAdvice(input: Awaited<ReturnType<typeof getDashboardSummary>> & { weeklyTotal: number; topCategory?: string; topAmount?: number }): Advice[] {
  const advice: Advice[] = []
  if (input.healthScore >= 85) advice.push({ title: 'Keuanganmu sangat sehat', body: 'Pertahankan kebiasaan catat transaksi dan tambah target tabungan bertahap.', tone: 'good' })
  if (input.safeDailySpend <= 0) advice.push({ title: 'Mode hemat dulu', body: 'Aman Harian sedang nol. Tunda belanja non-penting sampai pemasukan berikutnya.', tone: 'warn' })
  if (input.monthlyExpense > input.monthlyIncome && input.monthlyIncome > 0) advice.push({ title: 'Pengeluaran melewati pemasukan', body: 'Review transaksi bulan ini dan kurangi kategori paling besar.', tone: 'warn' })
  if (input.topCategory && input.topAmount) advice.push({ title: `Kategori terbesar: ${input.topCategory}`, body: `${formatIDR(input.topAmount)} bulan ini. Pasang budget khusus agar tidak bocor halus.`, tone: 'info' })
  if (input.vaultAllocations <= 0) advice.push({ title: 'Belum ada dana tujuan', body: 'Buat vault dana darurat atau target besar agar saldo tidak tercampur uang belanja.', tone: 'info' })
  if (input.upcomingDebts > input.totalBalance * 0.35 && input.upcomingDebts > 0) advice.push({ title: 'Kewajiban cukup besar', body: 'Prioritaskan pelunasan utang jatuh tempo sebelum menambah pengeluaran besar.', tone: 'warn' })
  if (advice.length === 0) advice.push({ title: 'Mulai dari data kecil', body: 'Catat dompet, pemasukan, dan 3 transaksi pertama agar coach bisa memberi saran lebih tajam.', tone: 'info' })
  return advice.slice(0, 6)
}

export default async function CoachPage() {
  const [dash, flow, top] = await Promise.all([getDashboardSummary(), getSpendingFlowSummary(), getTopCategorySummary(5)])
  const weeklyTotal = flow.reduce((sum, row) => sum + row.total, 0)
  const advice = buildAdvice({ ...dash, weeklyTotal, topCategory: top[0]?.category, topAmount: top[0]?.amount })
  const nextBestAction = dash.walletCount === 0 ? 'Buat dompet pertama' : dash.monthlyIncome === 0 ? 'Catat pemasukan utama' : dash.vaultAllocations === 0 ? 'Buat target tabungan' : dash.upcomingDebts > 0 ? 'Review utang/piutang' : 'Review budget mingguan'

  return (
    <main className="page-shell max-w-3xl">
      <Link href="/insights" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden /> Laporan</Link>
      <header className="page-header"><div><p className="eyebrow">Coach</p><h1>Asisten keuangan</h1><p>Saran praktis dari pola saldo, pengeluaran, tabungan, dan kewajibanmu.</p></div><span className="icon-tile"><Lightbulb className="h-5 w-5" aria-hidden /></span></header>

      <section className="surface-card mb-6 rounded-3xl p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">Langkah terbaik berikutnya</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{nextBestAction}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">Skor kesehatan {dash.healthScore}/100 · Aman Harian {formatIDR(dash.safeDailySpend)} · 7 hari terakhir {formatIDR(weeklyTotal)}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {advice.map((item) => {
          const Icon = item.tone === 'good' ? PiggyBank : item.tone === 'warn' ? ShieldAlert : TrendingDown
          return <article key={item.title} className="surface-card rounded-3xl p-5"><span className={`icon-tile ${item.tone === 'warn' ? 'text-danger' : ''}`}><Icon className="h-5 w-5" aria-hidden /></span><h2 className="mt-4 font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{item.body}</p></article>
        })}
      </section>
    </main>
  )
}
