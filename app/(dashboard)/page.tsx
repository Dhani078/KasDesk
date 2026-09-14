import Link from 'next/link'
import { TrendingUp, TrendingDown, Wallet, Settings, ShieldCheck, Sparkles, PlusCircle, ArrowUpRight, EyeOff } from 'lucide-react'

import { auth } from '@/auth'
import { getRecentTransactions, getWallets } from '@/lib/actions'
import { getDashboardSummary } from '@/lib/analytics/actions'
import { formatIDR } from '@/lib/format'
import { QuickLogButton } from '@/components/QuickLogSheet'
import { EmptyState } from '@/components/EmptyState'
import { LogoutButton } from '@/components/LogoutButton'
import { HomeFeed } from '@/components/HomeFeed'
import { PrivacyToggle } from '@/components/PrivacyToggle'
import { DailyFocus } from '@/components/DailyFocus'
import { MetricCard } from '@/components/MetricCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [session, dash, recent, wallets] = await Promise.all([
    auth(),
    getDashboardSummary(),
    getRecentTransactions(20),
    getWallets(),
  ])

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Kawan'
  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'
  const hasWallets = wallets.length > 0
  const walletNames: Record<string, string> = Object.fromEntries(wallets.map((w) => [w.id, w.name]))
  const hasAnyData = hasWallets || recent.length > 0 || dash.monthlyIncome > 0 || dash.monthlyExpense > 0
  const netMonth = dash.monthlyIncome - dash.monthlyExpense

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 pt-7 pb-32 sm:px-8 sm:pt-10">
      <header className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{greeting}</p><h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-text-primary capitalize">{userName} 👋</h2><p className="mt-1 text-sm leading-6 text-text-secondary">Ringkasan uangmu hari ini. Fokus ke hal penting, tanpa ribet.</p></div><div className="flex shrink-0 items-center gap-2"><PrivacyToggle /><Link href="/settings" aria-label="Pengaturan" className="grid h-11 w-11 place-items-center rounded-xl border border-border-outer bg-surface text-text-secondary transition hover:border-accent/35 hover:text-text-primary active:scale-95"><Settings className="h-4 w-4" aria-hidden /></Link><LogoutButton /></div></div>

        {!hasAnyData && <section className="mb-4 rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/15 to-accent/5 p-5"><div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent"><Sparkles className="h-5 w-5" aria-hidden /></span><div><h1 className="text-lg font-semibold text-text-primary">Mulai dari dompet pertama</h1><p className="mt-1 text-sm leading-6 text-text-secondary">Tambahkan cash, bank, atau e-wallet. Setelah itu dashboard otomatis menampilkan Aman Harian dan laporan.</p><Link href="/wallets" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent-solid px-4 text-sm font-semibold text-white"><PlusCircle className="h-4 w-4" aria-hidden /> Buat dompet</Link></div></div></section>}

        <section className="surface-card relative overflow-hidden rounded-[2rem] border border-border-outer p-5 shadow-sm sm:p-6"><div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-accent/15 blur-3xl" aria-hidden /><div className="relative"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.1em] text-text-secondary">Total saldo</p><p className="mt-1 text-xs text-text-secondary">Semua dompet aktif</p></div><span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{dash.walletCount} Dompet</span></div><h1 className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-text-primary sm:text-5xl">{formatIDR(dash.totalBalance)}</h1><div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white/[0.035] p-3"><p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Aman / hari</p><p className="mt-1 font-mono text-sm font-semibold text-accent-income">{formatIDR(dash.safeDailySpend)}</p></div><div className="rounded-2xl bg-white/[0.035] p-3"><p className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Bulan ini</p><p className={`mt-1 font-mono text-sm font-semibold ${netMonth >= 0 ? 'text-accent-income' : 'text-accent-expense'}`}>{formatIDR(netMonth)}</p></div></div><p className="mt-4 flex items-start gap-2 text-xs leading-5 text-text-secondary"><EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Aktifkan mode privasi kalau sedang di tempat umum.</p></div></section>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-2" aria-label="Aksi cepat"><Link href="/transactions" className="surface-card rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95"><PlusCircle className="mx-auto mb-2 h-5 w-5 text-accent" aria-hidden />Catat</Link><Link href="/insights" className="surface-card rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95"><ArrowUpRight className="mx-auto mb-2 h-5 w-5 text-accent" aria-hidden />Laporan</Link></section>

      <DailyFocus dash={dash} />

      <section className="surface-card mb-6 rounded-3xl p-5"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><ShieldCheck className="h-5 w-5" aria-hidden /></span><div><p className="text-xs uppercase tracking-[0.08em] text-text-secondary">Skor kesehatan</p><h2 className="text-lg font-semibold text-text-primary">{dash.healthLabel}</h2></div></div><p className="font-mono text-3xl font-semibold text-accent">{dash.healthScore}</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-accent" style={{ width: `${dash.healthScore}%` }} /></div><p className="mt-3 text-xs leading-5 text-text-secondary">Savings rate bulan ini {dash.savingsRate}%. {dash.healthTips[0] ?? 'Pertahankan ritme catatan dan review mingguan.'}</p><Link href="/insights" className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-border-outer px-3 text-xs font-semibold text-accent transition hover:border-accent/35">Lihat laporan →</Link></section>

      {hasWallets && <section className="mb-6"><div className="mb-2.5 flex items-center justify-between"><div><p className="text-sm font-semibold text-text-primary">Dompet kamu</p><p className="text-xs text-text-secondary">Geser untuk melihat semua saldo.</p></div><Link href="/wallets" className="text-xs font-semibold text-accent hover:underline">Kelola &rarr;</Link></div><div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 py-1 scrollbar-none">{wallets.map((w) => <Link key={w.id} href={`/wallets/${w.id}`} className="shrink-0 flex min-w-40 items-center gap-2.5 rounded-2xl border border-border-outer bg-surface/80 px-3.5 py-3 text-xs transition hover:border-accent/40 active:scale-95"><span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/10 text-accent"><Wallet className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate font-semibold text-text-primary">{w.name}</p><p className="font-mono text-text-secondary tabular-nums">{formatIDR(w.balance)}</p></div></Link>)}</div></section>}

      <section className="mb-6 grid grid-cols-2 gap-3"><MetricCard label="Masuk" value={formatIDR(dash.monthlyIncome)} tone="good" icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />} helper="Pemasukan bulan ini" /><MetricCard label="Keluar" value={formatIDR(dash.monthlyExpense)} tone="bad" icon={<TrendingDown className="h-3.5 w-3.5" aria-hidden />} helper="Pengeluaran bulan ini" /></section>

      <section><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold text-text-primary">Transaksi terbaru</h2><p className="text-xs text-text-secondary">Aktivitas terakhir dari semua dompet.</p></div><Link href="/transactions" className="text-xs font-semibold text-accent hover:underline">Semua</Link></div>{!hasWallets ? <EmptyState icon={<Wallet className="w-6 h-6" />} title="Belum ada dompet" body="Buat dompet pertama untuk mulai mencatat pemasukan, pengeluaran, dan target tabungan." actionHref="/wallets" actionLabel="Buat dompet" /> : recent.length === 0 ? <EmptyState icon={<Wallet className="w-6 h-6" />} title="Belum ada transaksi" body="Tekan tombol + di bawah untuk mencatat pemasukan atau pengeluaran pertama." /> : <HomeFeed rows={recent.map((r) => ({ id: r.id, walletId: r.walletId, type: r.type, amount: Number(r.amount ?? 0), title: r.title, categoryTag: r.categoryTag, occurredAt: r.occurredAt }))} walletNames={walletNames} />}</section>

      <QuickLogButton wallets={wallets} />
    </main>
  )
}
