'use client'

import { usePendingTx, type PendingTx } from './pending-tx'
import { formatIDR, formatDayGroup, formatTime, toDateKey } from '@/lib/format'

type TxRow = {
  id: string
  walletId: string | null
  type: string
  amount: number
  title: string
  categoryTag: string | null
  occurredAt: Date | string
}

/**
 * Home transaction feed (client).
 *
 * Renders the server rows plus any OPTIMISTIC pending rows (FR-LOG-6/11).
 * The server-refetched list is authoritative; pending rows sort on top by
 * order, newest first. A failed optimistic row is shown muted with a label
 * until the PendingTxProvider drops it.
 */
export function HomeFeed({
  rows,
  walletNames,
}: {
  rows: TxRow[]
  // Plain id->name map: server components can only pass serializable data.
  walletNames: Record<string, string>
}) {
  const { pending } = usePendingTx()
  const pendingRows: PendingTx[] = pending
  const walletName = (id: string | null): string | undefined =>
    id ? walletNames[id] : undefined

  // Optimistic rows first (a just-logged transaction should appear on top,
  // which is where the user is looking), then server rows.
  const all = [
    ...pendingRows.map((p, i) => ({ key: 'p' + p.clientId, isPending: true as const, p, order: i })),
    ...rows.map((r) => ({ key: r.id, isPending: false as const, r, order: rows.length })),
  ]

  if (all.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-outer bg-surface/50 px-4 py-8 text-center text-xs text-text-secondary">
        Belum ada transaksi. Tekan tombol tengah di bawah.
      </p>
    )
  }

  // Group by day, preserving position (pending rows in front).
  const groups: { day: string; items: typeof all }[] = []
  for (const item of all) {
    const d = item.isPending ? item.p.createdAt : new Date(item.r.occurredAt)
    const key = toDateKey(d)
    const last = groups[groups.length - 1]
    if (last && last.day === key) last.items.push(item)
    else groups.push({ day: key, items: [item] })
  }

  return (
    <ul className="space-y-4">
      {groups.map((g) => (
        <li key={g.day}>
          <p className="mb-2 text-[11px] uppercase tracking-[0.06em] text-text-secondary">
            {formatDayGroup(new Date(g.day))}
          </p>
          <div className="divide-y divide-border-inner overflow-hidden rounded-2xl border border-border-outer bg-surface">
            {g.items.map((item) => {
              if (item.isPending) {
                const t = item.p
                const isIncome = t.type === 'income'
                return (
                  <div
                    key={item.key}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      t.failed ? 'opacity-50' : 'opacity-80'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">
                        {t.failed ? `${t.title} — gagal` : t.title}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        {walletName(t.walletId) ? `${walletName(t.walletId)} · ` : ''}
                        {t.categoryTag} · {formatTime(t.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-sm font-medium tabular-nums ${
                        isIncome ? 'text-accent-income' : 'text-text-primary'
                      }`}
                    >
                      {isIncome ? '+' : '−'}
                      {formatIDR(Math.abs(t.amount))}
                    </span>
                  </div>
                )
              }
              const t = item.r
              const isIncome = t.type === 'income'
              return (
                <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">{t.title}</p>
                    <p className="text-[11px] text-text-secondary">
                      {walletName(t.walletId) ? `${walletName(t.walletId)} · ` : ''}
                      {t.categoryTag ?? 'LAINNYA'} · {formatTime(new Date(t.occurredAt))}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-sm font-medium tabular-nums ${
                      isIncome ? 'text-accent-income' : 'text-text-primary'
                    }`}
                  >
                    {isIncome ? '+' : '−'}
                    {formatIDR(Math.abs(t.amount))}
                  </span>
                </div>
              )
            })}
          </div>
        </li>
      ))}
    </ul>
  )
}