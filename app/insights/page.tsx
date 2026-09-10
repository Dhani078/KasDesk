import { PieChart } from 'lucide-react'

import { getSpendingFlow, getTopCategories, getDebts } from '@/lib/actions'
import { formatIDR, formatDateShort } from '@/lib/format'
import { EmptyState } from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const [flow, top, debts] = await Promise.all([
    getSpendingFlow(),
    getTopCategories(5),
    getDebts(),
  ])

  const maxFlow = Math.max(1, ...flow.map((f) => f.total))
  const openDebts = debts.filter((d) => !d.isPaid)

  return (
    <main className="min-h-dvh px-5 pt-8 pb-32">
      <h1 className="mb-6 text-xl font-semibold text-text-primary">Insight</h1>

      {/* 7-day spending flow — vertical bars, no pie charts (design system) */}
      <section className="mb-6 rounded-2xl border border-border-outer bg-surface p-4">
        <h2 className="mb-1 text-xs uppercase tracking-[0.08em] text-text-secondary">
          7 Hari Terakhir
        </h2>
        <p className="mb-4 font-mono text-lg font-semibold tabular-nums text-text-primary">
          {formatIDR(flow.reduce((s, f) => s + f.total, 0))}
        </p>
        <div className="flex h-24 items-end gap-1.5">
          {flow.map((f) => (
            <div key={f.day.toISOString()} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-accent-expense/80"
                style={{ height: `${Math.max(3, (f.total / maxFlow) * 72)}px` }}
                title={`${formatDateShort(f.day)}: ${formatIDR(f.total)}`}
              />
              <span className="text-[9px] text-text-secondary">
                {formatDateShort(f.day).split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Top categories */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs uppercase tracking-[0.08em] text-text-secondary">
          Kategori Terbesar
        </h2>
        {top.length === 0 ? (
          <EmptyState
            icon={<PieChart className="w-6 h-6" />}
            title="Belum ada pengeluaran"
            body="Insight muncul setelah Anda mencatat transaksi."
          />
        ) : (
          <ul className="space-y-3 rounded-2xl border border-border-outer bg-surface p-4">
            {top.map((c) => (
              <li key={c.category}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-sm text-text-primary">{c.category}</span>
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
                    {formatIDR(c.amount)}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.round(c.share * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Debts overview */}
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-[0.08em] text-text-secondary">
          Utang &amp; Piutang
        </h2>
        {openDebts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-outer bg-surface/50 px-4 py-6 text-center text-xs text-text-secondary">
            Tidak ada utang berjalan.
          </p>
        ) : (
          <ul className="divide-y divide-border-inner overflow-hidden rounded-2xl border border-border-outer bg-surface">
            {openDebts.map((d) => {
              const remaining = Math.max(0, Number(d.amount) - Number(d.paidAmount))
              const isOwed = d.direction === 'piutang'
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">{d.personName}</p>
                    <p className="text-[11px] text-text-secondary">
                      {isOwed ? 'Piutang' : 'Utang'}
                      {d.dueDate ? ` · jatuh tempo ${formatDateShort(d.dueDate)}` : ''}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-sm tabular-nums ${
                      isOwed ? 'text-accent-income' : 'text-accent-expense'
                    }`}
                  >
                    {formatIDR(remaining)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
