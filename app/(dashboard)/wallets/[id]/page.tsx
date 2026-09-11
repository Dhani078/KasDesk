import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq, and, desc } from 'drizzle-orm'
import { ArrowLeft } from 'lucide-react'

import { db } from '@/lib/db'
import { wallets, transactions } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { getWallets } from '@/lib/actions'
import { formatIDR, formatDayGroup, toDateKey, formatTime } from '@/lib/format'
import { EmptyState } from '@/components/EmptyState'
import { DeleteTransactionButton } from '@/components/DeleteTransactionButton'
import { EditTransactionButton } from '@/components/EditTransactionButton'

export const dynamic = 'force-dynamic'

export default async function WalletDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await requireUserId()
  if (!userId) notFound()

  // All active wallets, so editing can move a transaction to another one.
  const allWallets = await getWallets()

  // Ownership is enforced HERE — without the userId filter this page would
  // render any user's wallet. MySQL has no RLS to save us.
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, id), eq(wallets.userId, userId)))
    .limit(1)

  if (!wallet) notFound()

  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.walletId, id), eq(transactions.userId, userId)))
    .orderBy(desc(transactions.occurredAt))
    .limit(100)

  return (
    <main className="min-h-dvh px-5 pt-8 pb-32">
      <Link
        href="/wallets"
        className="mb-4 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Dompet
      </Link>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.08em] text-text-secondary">Saldo</p>
        <h1 className="font-mono text-3xl font-semibold tabular-nums text-text-primary">
          {formatIDR(wallet.balance)}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{wallet.name}</p>
      </header>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada transaksi" body="Transaksi dompet ini akan muncul di sini." />
      ) : (
        <ul className="space-y-4">
          {groupByDay(rows).map(([day, list]) => (
            <li key={day}>
              <p className="mb-2 text-xs uppercase tracking-[0.06em] text-text-secondary">
                {formatDayGroup(list[0].occurredAt)}
              </p>
              <div className="divide-y divide-border-inner overflow-hidden rounded-2xl border border-border-outer bg-surface">
                {list.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">{t.title}</p>
                      <p className="text-xs text-text-secondary">
                        {t.categoryTag ?? 'LAINNYA'} · {formatTime(t.occurredAt)}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-sm tabular-nums ${
                        t.type === 'income' ? 'text-accent-income' : 'text-text-primary'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '−'}
                      {formatIDR(t.amount)}
                    </span>
                    <EditTransactionButton
                      txn={{
                        id: t.id,
                        walletId: t.walletId,
                        title: t.title,
                        amount: Number(t.amount),
                        type: t.type as 'income' | 'expense' | 'transfer',
                        categoryTag: t.categoryTag,
                        note: t.note,
                        occurredAt: t.occurredAt.toISOString(),
                      }}
                      wallets={allWallets.map((w) => ({
                        id: w.id,
                        name: w.name,
                      }))}
                    />
                    <DeleteTransactionButton
                      txn={{
                        id: t.id,
                        title: t.title,
                        amount: Number(t.amount),
                        type: t.type as 'income' | 'expense' | 'transfer',
                      }}
                    />
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

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
