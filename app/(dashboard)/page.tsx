import Link from 'next/link'
import { TrendingUp, TrendingDown, Wallet, Settings } from 'lucide-react'

import { getDashboard, getRecentTransactions, getWallets } from '@/lib/actions'
import { formatIDR } from '@/lib/format'
import { QuickLogButton } from '@/components/QuickLogSheet'
import { EmptyState } from '@/components/EmptyState'
import { LogoutButton } from '@/components/LogoutButton'
import { HomeFeed } from '@/components/HomeFeed'
import { PrivacyToggle } from '@/components/PrivacyToggle'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [dash, recent, wallets] = await Promise.all([
    getDashboard(),
    getRecentTransactions(20),
    getWallets(),
  ])

  const hasWallets = wallets.length > 0

  // FR-TXN-2: id->name map for the feed (plain data; HomeFeed is a client
  // component and cannot receive a function from the server).
  const walletNames: Record<string, string> = Object.fromEntries(
    wallets.map((w) => [w.id, w.name]),
  )

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 pt-8 pb-32 sm:px-8 sm:pt-12">
      {/* ── Hero: total balance ─────────────────────────── */}
      <header className="mb-6">
        <div className="mb-1 flex items-start justify-between">
          <p className="text-xs uppercase tracking-[0.08em] text-text-secondary">
            Total Saldo
          </p>
          <div className="flex items-center gap-2"><PrivacyToggle /><Link href="/settings" aria-label="Pengaturan" className="grid h-11 w-11 place-items-center rounded-xl border border-border-outer bg-surface text-text-secondary transition hover:text-text-primary active:scale-95"><Settings className="h-4 w-4" aria-hidden /></Link><LogoutButton /></div>
        </div>
        <h1 className="font-mono text-4xl font-semibold tabular-nums text-text-primary">
          {formatIDR(dash.totalBalance)}
        </h1>
        <p className="mt-1 text-xs text-text-secondary">
          {dash.walletCount} dompet aktif
        </p>
      </header>

      {/* ── Safe Daily Spend (PRD FR-INS-1/2) ───────────── */}
      <section className="mb-6 surface-card rounded-2xl p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-[0.08em] text-text-secondary">
            Aman Harian
          </p>
          <span className="font-mono text-2xl font-semibold tabular-nums text-accent-income">
            {formatIDR(dash.safeDailySpend)}
          </span>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          Bisa dibelanjakan per hari · {dash.daysLeft} hari tersisa bulan ini
        </p>
        {(dash.vaultAllocations > 0 || dash.upcomingDebts > 0) && (
          <p className="mt-2 text-xs text-text-secondary">
            Tabungan tersimpan {formatIDR(dash.vaultAllocations)} · utang diperhitungkan{' '}
            {formatIDR(dash.upcomingDebts)}
          </p>
        )}
      </section>

      {/* ── Month summary ───────────────────────────────── */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="surface-card rounded-2xl p-5">
          <div className="flex items-center gap-1.5 text-text-secondary mb-1">
            <TrendingUp className="w-3.5 h-3.5" aria-hidden />
            <span className="text-xs uppercase tracking-[0.06em]">Masuk</span>
          </div>
          <p className="font-mono text-lg font-semibold tabular-nums text-accent-income">
            {formatIDR(dash.monthlyIncome)}
          </p>
        </div>
        <div className="surface-card rounded-2xl p-5">
          <div className="flex items-center gap-1.5 text-text-secondary mb-1">
            <TrendingDown className="w-3.5 h-3.5" aria-hidden />
            <span className="text-xs uppercase tracking-[0.06em]">Keluar</span>
          </div>
          <p className="font-mono text-lg font-semibold tabular-nums text-accent-expense">
            {formatIDR(dash.monthlyExpense)}
          </p>
        </div>
      </section>

      {/* ── Recent transactions ─────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Transaksi</h2>
          <Link href="/transactions" className="text-xs text-accent hover:underline">
            Semua transaksi
          </Link>
        </div>

        {!hasWallets ? (
          <EmptyState
            icon={<Wallet className="w-6 h-6" />}
            title="Belum ada dompet"
            body="Buat dompet pertama untuk mulai mencatat."
          />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Wallet className="w-6 h-6" />}
            title="Belum ada transaksi"
            body="Tekan tombol tengah di bawah untuk mencatat pengeluaran pertama."
          />
        ) : (
          <HomeFeed
            rows={recent.map((r) => ({
              id: r.id,
              walletId: r.walletId,
              type: r.type,
              amount: Number(r.amount ?? 0),
              title: r.title,
              categoryTag: r.categoryTag,
              occurredAt: r.occurredAt,
            }))}
            walletNames={walletNames}
          />
        )}
      </section>

      <QuickLogButton wallets={wallets} />
    </main>
  )
}