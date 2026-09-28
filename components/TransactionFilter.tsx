'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, Tag as TagIcon, X, Loader2 } from 'lucide-react'

export function TransactionFilter({
  walletRows,
  categories,
  allTags,
  initialFilters,
}: {
  walletRows: { id: string; name: string }[]
  categories: readonly string[]
  allTags: string[]
  initialFilters: {
    search?: string
    type?: string
    wallet?: string
    category?: string
    from?: string
    to?: string
  }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(initialFilters.search ?? '')
  const [type, setType] = useState(initialFilters.type ?? '')
  const [wallet, setWallet] = useState(initialFilters.wallet ?? '')
  const [category, setCategory] = useState(initialFilters.category ?? '')
  const [from, setFrom] = useState(initialFilters.from ?? '')
  const [to, setTo] = useState(initialFilters.to ?? '')

  useEffect(() => {
    setSearch(initialFilters.search ?? '')
    setType(initialFilters.type ?? '')
    setWallet(initialFilters.wallet ?? '')
    setCategory(initialFilters.category ?? '')
    setFrom(initialFilters.from ?? '')
    setTo(initialFilters.to ?? '')
  }, [initialFilters])

  const isFiltered = Boolean(
    initialFilters.search ||
    initialFilters.type ||
    initialFilters.wallet ||
    initialFilters.category ||
    initialFilters.from ||
    initialFilters.to
  )

  function applyFilter(updates: Partial<typeof initialFilters>) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('cursor') // Always reset cursor on filter change

    const next = {
      search,
      type,
      wallet,
      category,
      from,
      to,
      ...updates,
    }

    for (const [key, value] of Object.entries(next)) {
      if (value && value.trim()) {
        params.set(key, value.trim())
      } else {
        params.delete(key)
      }
    }

    startTransition(() => {
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    applyFilter({})
  }

  const typeOptions = [
    { label: 'Semua', value: '' },
    { label: 'Pemasukan', value: 'income' },
    { label: 'Pengeluaran', value: 'expense' },
    { label: 'Transfer', value: 'transfer' },
  ]

  return (
    <form onSubmit={handleSubmit} className="surface-card rounded-3xl p-5 sm:p-6 transition-all">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="section-title">Filter transaksi</h2>
        </div>
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> Memuat...
          </span>
        )}
      </div>

      {/* Quick Type Selection Pills */}
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {typeOptions.map((opt) => {
          const isActive = type === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setType(opt.value)
                applyFilter({ type: opt.value })
              }}
              className={`min-h-9 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-accent-solid text-white shadow-sm'
                  : 'bg-white/[0.04] text-text-secondary ring-1 ring-border-outer hover:text-text-primary hover:bg-white/[0.08]'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label sm:col-span-2">
          Cari
          <div className="field-with-icon">
            <Search className="h-4 w-4 text-text-secondary" aria-hidden />
            <input
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Judul, catatan, atau #label (tekan enter)"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  applyFilter({ search: '' })
                }}
                className="!min-h-0 !min-w-0 p-1 text-text-secondary hover:text-text-primary cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </label>

        <label className="field-label">
          Dompet
          <select
            name="wallet"
            value={wallet}
            onChange={(e) => {
              const val = e.target.value
              setWallet(val)
              applyFilter({ wallet: val })
            }}
          >
            <option value="">Semua dompet</option>
            {walletRows.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Kategori
          <select
            name="category"
            value={category}
            onChange={(e) => {
              const val = e.target.value
              setCategory(val)
              applyFilter({ category: val })
            }}
          >
            <option value="">Semua kategori</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Mulai
          <input
            name="from"
            type="date"
            value={from}
            onChange={(e) => {
              const val = e.target.value
              setFrom(val)
              applyFilter({ from: val })
            }}
          />
        </label>

        <label className="field-label">
          Sampai
          <input
            name="to"
            type="date"
            value={to}
            onChange={(e) => {
              const val = e.target.value
              setTo(val)
              applyFilter({ to: val })
            }}
          />
        </label>

        <div className="flex items-center justify-end gap-2 sm:col-span-2 mt-1">
          {isFiltered && (
            <Link
              href="/transactions"
              className="secondary-button cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden /> Reset filter
            </Link>
          )}
          <button type="submit" className="primary-button cursor-pointer">
            Terapkan filter
          </button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border-inner pt-3">
          <span className="flex items-center gap-1 text-xs text-text-secondary">
            <TagIcon className="h-3 w-3 text-accent" /> Filter Label:
          </span>
          {allTags.map((tag) => {
            const isActive = search === tag
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const nextSearch = isActive ? '' : tag
                  setSearch(nextSearch)
                  applyFilter({ search: nextSearch })
                }}
                className={`!min-h-0 !min-w-0 rounded-full px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-accent-solid text-white shadow-sm'
                    : 'bg-white/[0.04] text-text-secondary ring-1 ring-border-outer hover:text-text-primary'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}
    </form>
  )
}
