import Link from 'next/link'
import { ArrowLeft, ChevronRight, Search, SlidersHorizontal, Tag as TagIcon, X } from 'lucide-react'
import { and, desc, eq, gte, like, lt, lte, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, wallets } from '@/lib/db/schema'
import { requireUserId } from '@/lib/auth/session'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { formatIDR, formatDateShort } from '@/lib/format'
import { extractTags } from '@/lib/tags'

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
  if (wallet) filters.push(eq(transactions.walletId, wallet))
  if (from) filters.push(gte(transactions.occurredAt, from))
  if (to) filters.push(lte(transactions.occurredAt, to))
  if (cursor) filters.push(or(lt(transactions.occurredAt, cursor.date), and(eq(transactions.occurredAt, cursor.date), lt(transactions.id, cursor.id)))!)
  const fetched = await db.select({ id: transactions.id, walletId: transactions.walletId, type: transactions.type, amount: transactions.amount, title: transactions.title, categoryTag: transactions.categoryTag, occurredAt: transactions.occurredAt, note: transactions.note }).from(transactions).where(and(...filters)).orderBy(desc(transactions.occurredAt), desc(transactions.id)).limit(PAGE_SIZE + 1)
  const hasMore = fetched.length > PAGE_SIZE
  const rows = fetched.slice(0, PAGE_SIZE)
  const names = Object.fromEntries(walletRows.map((item) => [item.id, item.name]))
  const filtered = Boolean(q.search || type || category || wallet || q.from || q.to)
  const allTags = Array.from(new Set(rows.flatMap((r) => [...extractTags(r.note), ...extractTags(r.title)])))
  const activeTag = q.search?.trim().startsWith('#') ? q.search.trim() : null
  const tagExpenseTotal = activeTag ? rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0) : null
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(q)) if (value && key !== 'cursor') params.set(key, value)
  const last = rows.at(-1)
  if (hasMore && last) params.set('cursor', Buffer.from(`${last.occurredAt.toISOString()}|${last.id}`).toString('base64url'))

  return <main className="page-shell max-w-3xl">
    <Link href="/" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard</Link>
    <header className="page-header"><div><p className="eyebrow">Riwayat</p><h1>Semua transaksi</h1><p>Cari judul, catatan, kategori, dompet, dan rentang tanggal.</p></div>{filtered && <Link href="/transactions" className="secondary-button"><X className="h-4 w-4" aria-hidden /> Reset</Link>}</header>
    <form className="surface-card rounded-3xl p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden /><h2 className="section-title">Filter transaksi</h2></div><div className="grid gap-4 sm:grid-cols-2">
      <label className="field-label sm:col-span-2">Cari<div className="field-with-icon"><Search className="h-4 w-4" aria-hidden /><input name="search" defaultValue={q.search} placeholder="Judul, catatan, atau kategori" /></div></label>
      <label className="field-label">Jenis<select name="type" defaultValue={type ?? ''}><option value="">Semua jenis</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option><option value="transfer">Transfer</option></select></label>
      <label className="field-label">Dompet<select name="wallet" defaultValue={wallet ?? ''}><option value="">Semua dompet</option>{walletRows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field-label">Kategori<select name="category" defaultValue={category ?? ''}><option value="">Semua kategori</option>{CATEGORY_ENUM.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field-label">Mulai<input name="from" type="date" defaultValue={from ? q.from : ''} /></label>
      <label className="field-label">Sampai<input name="to" type="date" defaultValue={to ? q.to : ''} /></label>
      <button className="primary-button sm:self-end">Terapkan filter</button>
    </div>
    {allTags.length > 0 && (
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border-inner pt-3">
        <span className="flex items-center gap-1 text-xs text-text-secondary"><TagIcon className="h-3 w-3 text-accent" /> Filter Label:</span>
        {allTags.map((tag) => {
          const isActive = q.search === tag
          const tagParams = new URLSearchParams()
          if (!isActive) tagParams.set('search', tag)
          return (
            <Link
              key={tag}
              href={`/transactions?${tagParams.toString()}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                isActive
                  ? 'bg-accent-solid text-white'
                  : 'bg-white/[0.04] text-text-secondary ring-1 ring-border-outer hover:text-text-primary'
              }`}
            >
              {tag}
            </Link>
          )
        })}
      </div>
    )}
    </form>

    {activeTag && (
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
        <span className="font-medium text-accent">Filter Label: {activeTag}</span>
        {tagExpenseTotal !== null && (
          <span className="text-xs text-text-secondary">
            Pengeluaran: <strong className="font-mono text-text-primary">{formatIDR(tagExpenseTotal)}</strong>
          </span>
        )}
      </div>
    )}

    <div className="mb-3 mt-7 flex items-center justify-between"><h2 className="section-title">Hasil</h2><span className="status-pill">{rows.length}{hasMore ? '+' : ''} transaksi</span></div>
    {rows.length ? <ul className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl">{rows.map((transaction) => {
      const rowTags = [...extractTags(transaction.note), ...extractTags(transaction.title)]
      return (
        <li key={transaction.id} className="transaction-row">
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
              {names[transaction.walletId] ?? 'Dompet'} · {transaction.categoryTag ?? 'LAINNYA'} · {formatDateShort(transaction.occurredAt)}
              {transaction.note ? ` · "${transaction.note}"` : ''}
            </p>
          </div>
          <span className={`font-mono text-sm font-semibold ${transaction.type === 'income' ? 'text-accent-income' : transaction.type === 'expense' ? 'text-accent-expense' : 'text-accent'}`}>
            {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : '↔'}{formatIDR(transaction.amount)}
          </span>
        </li>
      )
    })}</ul> : <div className="empty-panel"><Search className="h-6 w-6 text-accent" aria-hidden /><h2>Tidak ada transaksi</h2><p>Coba ubah kata pencarian atau rentang tanggal.</p></div>}
    {hasMore && <Link href={`/transactions?${params.toString()}`} className="secondary-button mt-5 w-full">Muat transaksi berikutnya <ChevronRight className="h-4 w-4" aria-hidden /></Link>}
  </main>
}
