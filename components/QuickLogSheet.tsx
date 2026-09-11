'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { X, Loader2 } from 'lucide-react'

import { createTransaction } from '@/lib/actions'
import { usePendingTx } from '@/components/pending-tx'
import { enqueueOp } from '@/lib/offline/queue'
import type { ScanResult } from '@/components/ScanReceiptButton'

const ScanReceiptButton = dynamic(() => import('@/components/ScanReceiptButton').then((module) => module.ScanReceiptButton), { loading: () => <span className="h-14 w-14 animate-pulse rounded-2xl bg-surface" aria-hidden /> })
import { CATEGORY_ENUM } from '@/lib/schemas'
import { formatIDR } from '@/lib/format'

type WalletLite = { id: string; name: string; balance: number }

/**
 * Bottom sheet for logging a transaction quickly.
 *
 * Wired to the centre FAB, which previously had no onClick at all
 * (PRD §11 defect). Amount is entered in whole rupiah and validated
 * server-side by Zod (`.int().positive()`).
 */
export function QuickLogSheet({ wallets }: { wallets: WalletLite[] }) {
  const [open, setOpen] = useState(false)
  const [scanned, setScanned] = useState<ScanResult | null>(null)

  return (
    <>
      <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 flex items-center gap-3">
        <ScanReceiptButton onResult={(r) => { setScanned(r); setOpen(true) }} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Catat transaksi"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-text-primary text-canvas shadow-lg"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
      {open && (
        <Sheet
          wallets={wallets}
          prefill={scanned}
          onClose={() => { setOpen(false); setScanned(null) }}
        />
      )}
    </>
  )
}

export function QuickLogButton({ wallets }: { wallets: WalletLite[] }) {
  return <QuickLogSheet wallets={wallets} />
}

function Sheet({
  wallets,
  prefill,
  onClose,
}: {
  wallets: WalletLite[]
  prefill: ScanResult | null
  onClose: () => void
}) {
  const { addPending, resolvePending } = usePendingTx()
  const [pending, setPending] = useState(false)
  // FR-LOG-7: default to the last-used wallet, fall back to the first one.
  // FR-LOG-3: amount as formatted IDR text ("12.000"); parsed by stripping
  // non-digits on submit. State instead of DOM read so the format masks live.
  const [amountText, setAmountText] = useState(() => prefill?.detected_total ? formatIDR(prefill.detected_total).replace(/^Rp\s?/, '') : '')
  // FR-LOG-5: selected category + last-used ordering (localStorage).
  const [catSel, setCatSel] = useState(() => {
    if (prefill?.detected_category) return prefill.detected_category
    if (typeof window === 'undefined') return 'LAINNYA'
    try {
      return localStorage.getItem('kasdesk:last-category') || 'LAINNYA'
    } catch { return 'LAINNYA' }
  })
  const [catOrder, setCatOrder] = useState<string[]>(() => {
    try {
      const last = localStorage.getItem('kasdesk:last-category')
      if (last && CATEGORY_ENUM.includes(last as (typeof CATEGORY_ENUM)[number])) {
        return [last, ...CATEGORY_ENUM.filter((c) => c !== last)]
      }
    } catch {}
    return [...CATEGORY_ENUM]
  })
  // FR-LOG-3: format "12000" -> "12.000" while typing.
  function onAmountChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 12)
    setAmountText(digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '')
  }
  function pickCat(c: string) {
    setCatSel(c)
    try { localStorage.setItem('kasdesk:last-category', c) } catch {}
    setCatOrder([c, ...CATEGORY_ENUM.filter((x) => x !== c)])
  }

  const [walletSel, setWalletSel] = useState(() => {
    if (typeof window === 'undefined') return wallets[0]?.id ?? ''
    try {
      const last = localStorage.getItem('kasdesk:last-wallet')
      if (last && wallets.some((w) => w.id === last)) return last
    } catch {}
    return wallets[0]?.id ?? ''
  })
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const [titleText, setTitleText] = useState(() =>
    prefill?.merchant_name && prefill.merchant_name !== 'UNKNOWN' ? prefill.merchant_name : '',
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const fd = new FormData(e.currentTarget)
    const payload = {
      client_mutation_id: crypto.randomUUID(),
      wallet_id: String(fd.get('wallet_id') ?? ''),
      type: String(fd.get('type') ?? 'expense'),
      amount: Number(String(fd.get('amount') ?? '0').replace(/[^\d]/g, '')),
      title: String(fd.get('title') ?? ''),
      category_tag: String(fd.get('category_tag') ?? 'LAINNYA'),
      note: String(fd.get('note') ?? '') || undefined,
    }

    // FR-OFF-2/6: offline does not mean failure — park the op in the
    // IndexedDB queue (survives reload) and let OfflineIndicator drain it on
    // reconnect. The 'offline' state here is the browser's, not the server's
    // — a queued payment is still visible and still synced, just later.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await enqueueOp({ kind: 'create-transaction', payload })
        setPending(false)
        setOk(true)
        setTimeout(onClose, 700)
        return
      } catch {
        // IndexedDB unavailable (private mode etc.): fall through to the
        // normal path, which will at least produce an error message.
      }
    }

    // FR-LOG-6: optimistic row appears in the feed immediately (before the
    // network round-trip); FR-LOG-11: on failure it rolls back.
    const clientId = addPending({
      walletId: payload.wallet_id,
      type: payload.type as 'income' | 'expense' | 'transfer',
      amount: payload.amount,
      title: payload.title,
      categoryTag: payload.category_tag ?? 'LAINNYA',
    })

    const res = await createTransaction(payload)

    setPending(false)
    if (!res.success) {
      resolvePending(clientId, false)
      setError(res.error.message)
      return
    }
    resolvePending(clientId, true)
    setOk(true)
    setTimeout(onClose, 700)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat transaksi"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Catat Transaksi</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {prefill?.needs_confirmation && (
          <p
            role="status"
            className="mb-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-text-secondary"
          >
            Hasil scan kurang pasti
            {prefill.confidence_score > 0
              ? ` (${Math.round(prefill.confidence_score * 100)}%)`
              : ''}
            . Periksa nominal sebelum menyimpan.
          </p>
        )}

        {ok ? (
          <p className="py-8 text-center text-sm text-accent-income">Tersimpan ✓</p>
        ) : wallets.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Buat dompet dulu sebelum mencatat.
          </p>
        ) : (
          <form id="ql-form" onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(['expense', 'income', 'transfer'] as const).map((t) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" name="type" value={t} defaultChecked={t === 'expense'} className="peer sr-only" />
                  <span className="block rounded-xl border border-border-outer px-2 py-2 text-center text-xs capitalize text-text-secondary peer-checked:border-accent peer-checked:text-text-primary">
                    {t === 'expense' ? 'Keluar' : t === 'income' ? 'Masuk' : 'Transfer'}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label htmlFor="amount" className="mb-1 block text-xs text-text-secondary">
                Jumlah (Rp)
              </label>
              <input
                id="amount"
                name="amount"
                inputMode="numeric"
                autoFocus
                required
                placeholder="0"
                value={amountText}
                onChange={(e) => onAmountChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="title" className="mb-1 block text-xs text-text-secondary">
                Keterangan
              </label>
              <input
                id="title"
                name="title"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                required
                maxLength={120}
                placeholder="Nasi Goreng"
                className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="wallet_id" className="mb-1 block text-xs text-text-secondary">
                  Dompet
                </label>
                <select
                  id="wallet_id"
                  name="wallet_id"
                  value={walletSel}
                  onChange={(e) => {
                    setWalletSel(e.target.value)
                    try { localStorage.setItem('kasdesk:last-wallet', e.target.value) } catch {}
                  }}
                  required
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} · {formatIDR(w.balance)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="category_tag" className="mb-1 block text-xs text-text-secondary">
                  Kategori
                </label>
                <input type="hidden" name="category_tag" value={catSel} />
                <div
                  role="radiogroup"
                  aria-label="Kategori"
                  className="flex flex-wrap gap-1.5"
                >
                  {catOrder.map((c) => (
                    <button
                      type="button"
                      key={c}
                      role="radio"
                      aria-checked={catSel === c}
                      onClick={() => pickCat(c)}
                      className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                        catSel === c
                          ? 'bg-accent-solid text-white'
                          : 'bg-white/[0.04] text-text-secondary ring-1 ring-border-outer'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              {pending ? 'Menyimpan…' : 'Simpan'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
