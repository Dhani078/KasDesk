import Link from 'next/link'
import { ArrowLeft, ChevronRight, Search, SlidersHorizontal, Tag as TagIcon, X } from 'lucide-react'
import { and, desc, eq, gte, like, lt, lte, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, wallets } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { formatDateShort } from '@/lib/format'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import { extractTags } from '@/lib/tags'
import { EditTransactionButton } from '@/components/EditTransactionButton'
import { DeleteTransactionButton } from '@/components/DeleteTransactionButton'
import { TransactionFilter } from '@/components/TransactionFilter'
import { EmptyState } from '@/components/EmptyState'

export const dynamic = 'force-dynamic'
const PAGE_SIZE = 30

function parseDay(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`)
  return Number.isNaN(date.getTime()) ? null : date
}
function parseCursor(value: string | undefined) {
  if (!value) return null
  try {
    const [iso, id] = Buffer.from(value, 'base64url').toString('utf8').split('|')
    const date = new Date(iso)
    return !id || Number.isNaN(date.getTime()) ? null : { date, id }
  } catch { return null }
}

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const userId = await requireUserId()
  if (!userId) return null
  const q = await searchParams
  const walletRows = await db.select({ id: wallets.id, name: wallets.name }).from(wallets).where(eq(wallets.userId, userId))
  const walletIds = new Set(walletRows.map((wallet) => wallet.id))
  const type = q.type === 'income' || q.type === 'expense' || q.type === 'transfer' ? q.type : undefined
  const category = CATEGORY_ENUM.includes(q.category as (typeof CATEGORY_ENUM)[number]) ? q.category : undefined
  const wallet = q.wallet && walletIds.has(q.wallet) ? q.wallet : undefined
  const from = parseDay(q.from)
  const to = parseDay(q.to, true)
  const cursor = parseCursor(q.cursor)
  const filters = [eq(transactions.userId, userId)]
  if (q.search?.trim()) {
    const term = `%${q.search.trim().slice(0, 80)}%`
    filters.push(or(like(transactions.title, term), like(transactions.note, term), like(transactions.categoryTag, term))!)
  }
  if (type) filters.push(eq(transactions.type, type))
  if (category) filters.push(eq(transactions.categoryTag, category))
  if (wallet) filters.push(or(eq(transactions.walletId, wallet), eq(transactions.toWalletId, wallet))!)
  if (from) filters.push(gte(transactions.occurredAt, from))
  if (to) filters.push(lte(transactions.occurredAt, to))
  if (cursor) filters.push(or(lt(transactions.occurredAt, cursor.date), and(eq(transactions.occurredAt, cursor.date), lt(transactions.id, cursor.id)))!)
  const fetched = await db.select({ id: transactions.id, walletId: transactions.walletId, toWalletId: transactions.toWalletId, type: transactions.type, amount: transactions.amount, title: transactions.title, categoryTag: transactions.categoryTag, occurredAt: transactions.occurredAt, note: transactions.note }).from(transactions).where(and(...filters)).orderBy(desc(transactions.occurredAt), desc(transactions.id)).limit(PAGE_SIZE + 1)
  const hasMore = fetched.length > PAGE_SIZE
  const rows = fetched.slice(0, PAGE_SIZE)
  const names = Object.fromEntries(walletRows.map((item) => [item.id, item.name]))
  const filtered = Boolean(q.search || type || category || wallet || q.from || q.to)
  const allTags = Array.from(new Set(rows.flatMap((r) => [...extractTags(r.note), ...extractTags(r.title)])))
  const activeTag = q.search?.trim().startsWith('#') ? q.search.trim() : null
  const tagExpenseTotal = activeTag ? rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0) : null
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(q)) if (value && key !== 'cursor') params.set(key, value)
  const firstParams = new URLSearchParams()
  for (const [key, value] of Object.entries(q)) if (value && key !== 'cursor') firstParams.set(key, value)
  const firstPageHref = firstParams.toString() ? `/transactions?${firstParams.toString()}` : '/transactions'
  const last = rows.at(-1)
  if (hasMore && last) params.set('cursor', Buffer.from(`${last.occurredAt.toISOString()}|${last.id}`).toString('base64url'))

  return <main className="page-shell max-w-3xl">
    <Link href="/" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard</Link>
    <header className="page-header"><div><p className="eyebrow">Riwayat</p><h1>Semua transaksi</h1><p>Cari judul, catatan, kategori, dompet, dan rentang tanggal.</p></div>{filtered && <Link href="/transactions" className="secondary-button"><X className="h-4 w-4" aria-hidden /> Reset</Link>}</header>
    <TransactionFilter
      walletRows={walletRows}
      categories={CATEGORY_ENUM}
      allTags={allTags}
      initialFilters={{
        search: q.search,
        type,
        wallet,
        category,
        from: from ? q.from : undefined,
        to: to ? q.to : undefined,
      }}
    />

    {activeTag && (
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
        <span className="font-medium text-accent">Filter Label: {activeTag}</span>
        {tagExpenseTotal !== null && (
          <span className="text-xs text-text-secondary">
            Pengeluaran: <strong className="font-mono text-text-primary"><PrivacyAmount value={tagExpenseTotal} /></strong>
          </span>
        )}
      </div>
    )}

    <div className="mb-3 mt-7 flex items-center justify-between"><h2 className="section-title">Hasil</h2><span className="status-pill">{rows.length}{hasMore ? '+' : ''} transaksi</span></div>
    {rows.length ? <ul className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl">{rows.map((transaction) => {
      const rowTags = [...extractTags(transaction.note), ...extractTags(transaction.title)]
      const isTransfer = transaction.type === 'transfer'
      return (
        <li key={transaction.id} className="transaction-row flex-wrap sm:flex-nowrap gap-3">
          <div className={`transaction-dot ${transaction.type}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{transaction.title}</p>
              {rowTags.map((tag) => (
                <span key={tag} className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              {isTransfer && transaction.toWalletId
                ? `${names[transaction.walletId] ?? 'Dompet'} → ${names[transaction.toWalletId] ?? 'Tujuan'}`
                : names[transaction.walletId] ?? 'Dompet'}
              {' · '}
              {transaction.categoryTag ?? (isTransfer ? 'TRANSFER' : 'LAINNYA')}
              {' · '}
              {formatDateShort(transaction.occurredAt)}
              {transaction.note ? ` · "${transaction.note}"` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 self-end sm:self-center">
            <span className={`font-mono text-sm font-semibold tabular-nums ${transaction.type === 'income' ? 'text-accent-income' : transaction.type === 'expense' ? 'text-accent-expense' : 'text-accent'}`}>
              <PrivacyAmount value={transaction.amount} sign={transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : '↔'} />
            </span>
            <EditTransactionButton
              txn={{
                id: transaction.id,
                walletId: transaction.walletId,
                title: transaction.title,
                amount: Number(transaction.amount),
                type: transaction.type as 'income' | 'expense' | 'transfer',
                categoryTag: transaction.categoryTag,
                note: transaction.note,
                occurredAt: transaction.occurredAt.toISOString(),
              }}
              wallets={walletRows}
            />
            <DeleteTransactionButton
              txn={{
                id: transaction.id,
                title: transaction.title,
                amount: Number(transaction.amount),
                type: transaction.type as 'income' | 'expense' | 'transfer',
              }}
            />
          </div>
        </li>
      )
    })}</ul> : (
      <EmptyState
        icon={<Search className="h-6 w-6 text-accent" aria-hidden />}
        title="Tidak ada transaksi"
        body={filtered ? "Coba ubah filter atau kata kunci pencarian." : "Belum ada transaksi yang tercatat."}
        actionHref={filtered ? "/transactions" : undefined}
        actionLabel={filtered ? "Reset Filter" : undefined}
      />
    )}
    {(hasMore || cursor) && (
      <div className="mt-5 flex items-center gap-3">
        {cursor && (
          <Link href={firstPageHref} className="secondary-button flex-1 justify-center">
            &larr; Halaman Pertama
          </Link>
        )}
        {hasMore && (
          <Link href={`/transactions?${params.toString()}`} className="primary-button flex-1 justify-center">
            Muat transaksi berikutnya <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    )}
  </main>
}
