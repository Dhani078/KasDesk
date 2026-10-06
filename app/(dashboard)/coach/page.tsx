import Link from 'next/link'
import { ArrowLeft, Lightbulb, PiggyBank, ShieldAlert, TrendingDown } from 'lucide-react'
import { getSpendingFlow, getTopCategories, getWallets } from '@/lib/actions'
import { getDashboardSummary } from '@/lib/analytics/actions'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import { CoachChat } from '@/components/CoachChat'
import { TaxEstimatorModal } from '@/components/coach/TaxEstimatorModal'

export const dynamic = 'force-dynamic'

type Advice = {
  title: string
  body: React.ReactNode
  tone: 'good' | 'warn' | 'info'
  action?: { label: string; href: string }
}

function buildAdvice(input: Awaited<ReturnType<typeof getDashboardSummary>> & { weeklyTotal: number; topCategory?: string; topAmount?: number }): Advice[] {
  const advice: Advice[] = []
  if (input.healthScore >= 85) advice.push({ title: 'Keuanganmu sangat sehat', body: 'Pertahankan kebiasaan catat transaksi dan tambah target tabungan bertahap.', tone: 'good', action: { label: 'Tambah Target', href: '/vaults' } })
  if (input.safeDailySpend <= 0) advice.push({ title: 'Mode hemat dulu', body: 'Aman Harian sedang nol. Tunda belanja non-penting sampai pemasukan berikutnya.', tone: 'warn', action: { label: 'Atur Budget', href: '/planning' } })
  if (input.monthlyExpense > input.monthlyIncome && input.monthlyIncome > 0) advice.push({ title: 'Pengeluaran melewati pemasukan', body: 'Review transaksi bulan ini dan kurangi kategori paling besar.', tone: 'warn', action: { label: 'Cek Riwayat', href: '/transactions' } })
  if (input.topCategory && input.topAmount) advice.push({ title: `Kategori terbesar: ${input.topCategory}`, body: <><PrivacyAmount value={input.topAmount} /> bulan ini. Pasang budget khusus agar tidak bocor halus.</>, tone: 'info', action: { label: 'Pasang Budget', href: '/planning' } })
  if (input.vaultAllocations <= 0) advice.push({ title: 'Belum ada dana tujuan', body: 'Buat vault dana darurat atau target besar agar saldo tidak tercampur uang belanja.', tone: 'info', action: { label: 'Buat Target', href: '/vaults' } })
  if (input.upcomingDebts > input.totalBalance * 0.35 && input.upcomingDebts > 0) advice.push({ title: 'Kewajiban cukup besar', body: 'Prioritaskan pelunasan utang jatuh tempo sebelum menambah pengeluaran besar.', tone: 'warn', action: { label: 'Cek Utang & Piutang', href: '/debts' } })
  if (advice.length === 0) advice.push({ title: 'Mulai dari data kecil', body: 'Catat dompet, pemasukan, dan 3 transaksi pertama agar coach bisa memberi saran lebih tajam.', tone: 'info', action: { label: 'Kelola Dompet', href: '/wallets' } })
  return advice.slice(0, 6)
}

export default async function CoachPage() {
  const [dash, flow, top, walletsList] = await Promise.all([
    getDashboardSummary(),
    getSpendingFlow(),
    getTopCategories(5),
    getWallets(),
  ])
  const weeklyTotal = flow.reduce((sum, row) => sum + row.total, 0)
  const advice = buildAdvice({ ...dash, weeklyTotal, topCategory: top[0]?.category, topAmount: top[0]?.amount })
  const nextBestAction = dash.walletCount === 0
    ? { title: 'Buat dompet pertama', href: '/wallets' }
    : dash.monthlyIncome === 0
    ? { title: 'Catat pemasukan utama', href: '/transactions' }
    : dash.vaultAllocations === 0
    ? { title: 'Buat target tabungan', href: '/vaults' }
    : dash.upcomingDebts > 0
    ? { title: 'Review utang & piutang', href: '/debts' }
    : { title: 'Review budget mingguan', href: '/planning' }

  return (
    <main className="page-shell max-w-3xl">
      <Link href="/" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard</Link>
      <header className="page-header">
        <div>
          <p className="eyebrow">Coach</p>
          <h1>Asisten keuangan</h1>
          <p>Saran praktis dari pola saldo, pengeluaran, tabungan, dan kewajibanmu.</p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <TaxEstimatorModal defaultGross={dash.monthlyIncome > 0 ? dash.monthlyIncome * 12 : undefined} />
          </div>
        </div>
        <span className="icon-tile"><Lightbulb className="h-5 w-5" aria-hidden /></span>
      </header>

      <CoachChat
        wallets={walletsList.map((w) => ({ id: w.id, name: w.name, balance: Number(w.balance) }))}
        initialContext={{
          totalBalance: dash.totalBalance,
          safeDailySpend: dash.safeDailySpend,
          monthlyExpense: dash.monthlyExpense,
          monthlyIncome: dash.monthlyIncome,
          topCategory: top[0]?.category,
          healthScore: dash.healthScore,
        }}
      />

      <section className="surface-card mb-6 rounded-3xl p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-text-secondary">Langkah terbaik berikutnya</p>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{nextBestAction.title}</h2>
          <Link href={nextBestAction.href} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent-solid px-4 text-xs font-semibold text-white transition hover:brightness-110 active:scale-95 shrink-0">
            Lakukan sekarang &rarr;
          </Link>
        </div>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Level {dash.healthScore >= 85 ? 'Diamond 💎' : dash.healthScore >= 70 ? 'Gold 🥇' : dash.healthScore >= 55 ? 'Silver 🥈' : 'Bronze 🥉'} · Skor {dash.healthScore}/100 · Aman Harian <PrivacyAmount value={dash.safeDailySpend} /> · 7 hari terakhir <PrivacyAmount value={weeklyTotal} />
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {advice.map((item, i) => {
          const Icon = item.tone === 'good' ? PiggyBank : item.tone === 'warn' ? ShieldAlert : TrendingDown
          return (
            <article key={item.title} className="surface-card flex flex-col justify-between rounded-3xl p-5 animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div>
                <span className={`icon-tile ${item.tone === 'warn' ? 'text-danger' : ''}`}><Icon className="h-5 w-5" aria-hidden /></span>
                <h2 className="mt-4 font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{item.body}</p>
              </div>
              {item.action && (
                <div className="mt-4 pt-3 border-t border-border-inner">
                  <Link href={item.action.href} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    {item.action.label} &rarr;
                  </Link>
                </div>
              )}
            </article>
          )
        })}
      </section>
    </main>
  )
}
