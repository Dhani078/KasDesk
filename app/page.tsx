import Link from 'next/link'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

import { getDashboard, getRecentTransactions, getWallets } from '@/lib/actions'
import { formatIDR, formatSigned, formatDayGroup, toDateKey, formatTime } from '@/lib/format'
import { QuickLogButton } from '@/components/QuickLogSheet'
import { EmptyState } from '@/components/EmptyState'
import { LogoutButton } from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [dash, recent, wallets] = await Promise.all([
    getDashboard(),
    getRecentTransactions(20),
    getWallets(),
  ])

  const hasWallets = wallets.length > 0

  // FR-TXN-2: resolve wallet id to display name for the feed rows.
  const walletName = (id: string | null): string | undefined =>
    id ? wallets.find((w) => w.id === id)?.name : undefined

  return (
    <main className="min-h-dvh px-5 pt-8 pb-32">
      {/* ── Hero: total balance ─────────────────────────── */}
      <header className="mb-6">
        <div className="mb-1 flex items-start justify-between">
          <p className="text-xs uppercase tracking-[0.08em] text-text-secondary">
            Total Saldo
          </p>
          <LogoutButton />
        </div>
        <h1 className="font-mono text-4xl font-semibold tabular-nums text-text-primary">
          {formatIDR(dash.totalBalance)}
        </h1>
        <p className="mt-1 text-xs text-text-secondary">
          {dash.walletCount} dompet aktif
        </p>
      </header>

      {/* ── Safe Daily Spend (PRD FR-INS-1/2) ───────────── */}
      <section className="mb-6 rounded-2xl border border-border-outer bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-[0.08em] text-text-secondary">
            Aman Harian
          </p>
          <span className="font-mono text-2xl font-semibold tabular-nums text-accent-income">
            {formatIDR(dash.safeDailySpend)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-text-secondary">
          Bisa dibelanjakan per hari · {dash.daysLeft} hari tersisa bulan ini
        </p>
        {(dash.vaultAllocations > 0 || dash.upcomingDebts > 0) && (
          <p className="mt-2 text-[11px] text-text-secondary">
            Sudah dikurangi tabungan ({formatIDR(dash.vaultAllocations)}) dan utang (
            {formatIDR(dash.upcomingDebts)})
          </p>
        )}
      </section>

      {/* ── Month summary ───────────────────────────────── */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border-outer bg-surface p-4">
          <div className="flex items-center gap-1.5 text-text-secondary mb-1">
            <TrendingUp className="w-3.5 h-3.5" aria-hidden />
            <span className="text-[11px] uppercase tracking-[0.06em]">Masuk</span>
          </div>
          <p className="font-mono text-lg font-semibold tabular-nums text-accent-income">
            {formatIDR(dash.monthlyIncome)}
          </p>
        </div>
        <div className="rounded-2xl border border-border-outer bg-surface p-4">
          <div className="flex items-center gap-1.5 text-text-secondary mb-1">
            <TrendingDown className="w-3.5 h-3.5" aria-hidden />
            <span className="text-[11px] uppercase tracking-[0.06em]">Keluar</span>
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
          <Link href="/wallets" className="text-xs text-accent hover:underline">
            Lihat dompet
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
          <ul className="space-y-4">
            {groupByDay(recent).map(([day, rows]) => (
              <li key={day}>
                <p className="text-[11px] uppercase tracking-[0.06em] text-text-secondary mb-2">
                  {formatDayGroup(rows[0].occurredAt)}
                </p>
                <div className="rounded-2xl border border-border-outer bg-surface divide-y divide-border-inner overflow-hidden">
                  {rows.map((t) => {
                    const isIncome = t.type === 'income'
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-text-primary">{t.title}</p>
                          <p className="text-[11px] text-text-secondary">
                            {walletName(t.walletId) ? `${walletName(t.walletId)} · ` : ''}
                            {t.categoryTag ?? 'LAINNYA'} · {formatTime(t.occurredAt)}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-sm font-medium tabular-nums ${
                            isIncome ? 'text-accent-income' : 'text-text-primary'
                          }`}
                        >
                          {isIncome ? '+' : '−'}
                          {formatIDR(Math.abs(t.amount)).replace('Rp ', 'Rp ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <QuickLogButton wallets={wallets} />
    </main>
  )
}

/** Group rows into day buckets, preserving date order. */
function groupByDay<T extends { occurredAt: Date }>(rows: T[]): [string, T[]][] {
  const out: [string, T[]][] = []
  for (const r of rows) {
    const k = toDateKey(r.occurredAt)
    const last = out[out.length - 1]
    if (last && last[0] === k) last[1].push(r)
    else out.push([k, [r]])
  }
  return out
}
