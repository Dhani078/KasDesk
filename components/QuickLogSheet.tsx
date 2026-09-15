'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { X, Loader2, Calculator } from 'lucide-react'

import { createTransaction } from '@/lib/actions'
import { usePendingTx } from '@/components/pending-tx'
import { enqueueOp } from '@/lib/offline/queue'
import type { ScanResult } from '@/components/ScanReceiptButton'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { formatIDR } from '@/lib/format'
import { evaluateMathExpression, hasMathOperator } from '@/lib/calculator'
import { DateTransactionPicker, getLocalDateString } from '@/components/quicklog/DateTransactionPicker'
import { NoteWithTags } from '@/components/quicklog/NoteWithTags'

const ScanReceiptButton = dynamic(
  () => import('@/components/ScanReceiptButton').then((module) => module.ScanReceiptButton),
  { loading: () => <span className="h-6 w-20 animate-pulse rounded-full bg-surface" aria-hidden /> },
)

type WalletLite = { id: string; name: string; balance: number }

/**
 * Bottom sheet for logging a transaction quickly.
 *
 * Wired to the ShopeePay-style centre action button in BottomNav.
 * Amount is entered in whole rupiah and validated server-side by Zod (`.int().positive()`).
 */
export function QuickLogSheet({
  wallets: initialWallets = [],
  isOpen,
  onClose,
}: {
  wallets?: WalletLite[]
  isOpen?: boolean
  onClose?: () => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [syncedWallets, setSyncedWallets] = useState<WalletLite[]>([])
  const [scanned, setScanned] = useState<ScanResult | null>(null)

  const wallets = initialWallets.length > 0 ? initialWallets : syncedWallets

  useEffect(() => {
    const handleOpen = () => setInternalOpen(true)
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<WalletLite[]>
      if (custom.detail?.length) setSyncedWallets(custom.detail)
    }
    window.addEventListener('kasdesk:open-quicklog', handleOpen)
    window.addEventListener('kasdesk:sync-wallets', handleSync)
    return () => {
      window.removeEventListener('kasdesk:open-quicklog', handleOpen)
      window.removeEventListener('kasdesk:sync-wallets', handleSync)
    }
  }, [])

  const open = isOpen !== undefined ? isOpen : internalOpen
  const handleClose = () => {
    if (onClose) onClose()
    setInternalOpen(false)
    setScanned(null)
  }

  return (
    <>
      {open && (
        <Sheet
          wallets={wallets}
          prefill={scanned}
          onClose={handleClose}
        />
      )}
    </>
  )
}

export function QuickLogButton({ wallets }: { wallets?: WalletLite[] }) {
  useEffect(() => {
    if (wallets?.length && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kasdesk:sync-wallets', { detail: wallets }))
    }
  }, [wallets])
  return null
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
  const [activeScan, setActiveScan] = useState<ScanResult | null>(prefill)
  const [dateText, setDateText] = useState(() => {
    if (prefill?.detected_date) return prefill.detected_date
    return getLocalDateString()
  })

  // FR-LOG-7: default to the last-used wallet, fall back to the first one.
  // FR-LOG-3: amount as formatted IDR text ("12.000"); parsed by stripping
  // non-digits on submit. State instead of DOM read so the format masks live.
  const [amountText, setAmountText] = useState(() =>
    prefill?.detected_total ? formatIDR(prefill.detected_total).replace(/^Rp\s?/, '') : '',
  )

  // FR-LOG-5: selected category + last-used ordering (localStorage).
  const [catSel, setCatSel] = useState(() => {
    if (prefill?.detected_category) return prefill.detected_category
    if (typeof window === 'undefined') return 'LAINNYA'
    try {
      return localStorage.getItem('kasdesk:last-category') || 'LAINNYA'
    } catch {
      return 'LAINNYA'
    }
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
    if (/[+\-*/xX×÷]/.test(raw)) {
      setAmountText(raw)
      return
    }
    const clean = raw.replace(/[^\d]/g, '')
    if (!clean) {
      setAmountText('')
      return
    }
    setAmountText(clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
  }

  function applyOperator(op: string) {
    if (!amountText) return
    const trimmed = amountText.trim()
    if (/[+\-*/]$/.test(trimmed)) {
      setAmountText(trimmed.slice(0, -1) + op)
    } else {
      setAmountText(trimmed + op)
    }
  }

  function evaluateAndSetAmount() {
    if (!amountText) return
    const res = evaluateMathExpression(amountText)
    if (res !== null && res > 0) {
      setAmountText(formatIDR(res).replace(/^Rp\s?/, ''))
    }
  }

  function addQuickAmount(val: number) {
    const currentNum = Number(amountText.replace(/[^\d]/g, '') || '0')
    const nextNum = currentNum + val
    setAmountText(formatIDR(nextNum).replace(/^Rp\s?/, ''))
  }

  function pickCat(c: string) {
    setCatSel(c)
    try {
      localStorage.setItem('kasdesk:last-category', c)
    } catch {}
    setCatOrder((prev) => [c, ...prev.filter((x) => x !== c)])
  }

  const [walletSel, setWalletSel] = useState(() => {
    if (typeof window === 'undefined') return wallets[0]?.id ?? ''
    try {
      const last = localStorage.getItem('kasdesk:last-wallet')
      if (last && wallets.some((w) => w.id === last)) return last
    } catch {}
    return wallets[0]?.id ?? ''
  })

  const [titleText, setTitleText] = useState(() => prefill?.merchant_name ?? '')
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const mathLiveResult = hasMathOperator(amountText)
    ? evaluateMathExpression(amountText)
    : null

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    let finalAmountText = amountText
    if (mathLiveResult !== null && mathLiveResult > 0) {
      finalAmountText = String(mathLiveResult)
    }

    const clean = finalAmountText.replace(/[^\d]/g, '')
    const amount = Number(clean)
    if (!clean || !Number.isFinite(amount) || amount <= 0) {
      setError('Masukkan jumlah yang valid')
      return
    }

    setPending(true)
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') ?? '').trim()
    const type = String(fd.get('type') ?? 'expense') as 'income' | 'expense' | 'transfer'
    const categoryTag = catSel
    const note = noteText.trim() ? noteText.trim() : undefined

    const [year, month, day] = dateText.split('-').map(Number)
    const isToday = dateText === getLocalDateString()
    const now = new Date()
    const hours = isToday ? now.getHours() : 12
    const minutes = isToday ? now.getMinutes() : 0
    const seconds = isToday ? now.getSeconds() : 0
    const occurredDate = new Date(year, (month || 1) - 1, day || 1, hours, minutes, seconds)
    const occurredAtIso = occurredDate.toISOString()

    const payload = {
      client_mutation_id: crypto.randomUUID(),
      wallet_id: walletSel,
      type,
      amount,
      title: title || 'Transaksi Baru',
      category_tag: categoryTag,
      note,
      occurred_at: occurredAtIso,
    }

    // FR-OFF-2/6: offline does not mean failure — park the op in the
    // IndexedDB queue and optimistic-render as usual. When the connection
    // returns, sync.ts will replay it.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await enqueueOp({ kind: 'create-transaction', payload })
        addPending({
          walletId: payload.wallet_id,
          type: payload.type,
          amount: payload.amount,
          title: payload.title,
          categoryTag: payload.category_tag ?? 'LAINNYA',
          createdAt: occurredDate,
        })
        onClose()
        return
      } catch {
        // IndexedDB unavailable: fall through to normal submission and let
        // the fetch fail with its natural network error.
      }
    }

    const clientId = addPending({
      title: payload.title,
      amount: payload.amount,
      type: payload.type,
      walletId: payload.wallet_id,
      categoryTag: payload.category_tag ?? 'LAINNYA',
      createdAt: occurredDate,
    })

    try {
      const res = await createTransaction(payload)

      if (!res.success) {
        resolvePending(clientId, false)
        setError(res.error.message)
        setPending(false)
        return
      }

      resolvePending(clientId, true)
      setSaved(true)
      setTimeout(() => {
        onClose()
      }, 350)
    } catch {
      resolvePending(clientId, false)
      setError('Tidak dapat menyimpan transaksi. Coba lagi.')
      setPending(false)
    }
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
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Catat Transaksi</h2>
          <div className="flex items-center gap-2">
            <ScanReceiptButton
              variant="compact"
              onResult={(r) => {
                setActiveScan(r)
                if (r.detected_total) {
                  setAmountText(formatIDR(r.detected_total).replace(/^Rp\s?/, ''))
                }
                if (r.merchant_name) setTitleText(r.merchant_name)
                if (r.detected_category) pickCat(r.detected_category)
                if (r.detected_date) setDateText(r.detected_date)
              }}
              onUnavailable={(reason) => setError(reason)}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-lg p-1 text-text-secondary hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {activeScan && activeScan.needs_confirmation && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
          >
            <p className="font-semibold">Periksa nominal hasil scan</p>
            <p className="mt-0.5 text-amber-200/80">
              {activeScan.reason ?? 'AI membaca struk dengan kepastian rendah.'}
            </p>
          </div>
        )}

        {saved ? (
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
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    defaultChecked={t === 'expense'}
                    className="peer sr-only"
                  />
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && mathLiveResult !== null) {
                    e.preventDefault()
                    evaluateAndSetAmount()
                  }
                }}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
              />

              {mathLiveResult !== null && (
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calculator className="h-3.5 w-3.5" />
                    Hasil: = {formatIDR(mathLiveResult)}
                  </span>
                  <button
                    type="button"
                    onClick={evaluateAndSetAmount}
                    className="rounded-lg bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white transition hover:opacity-90 active:scale-95"
                  >
                    Gunakan
                  </button>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-lg border border-border-outer bg-white/[0.02] p-0.5">
                  {(['+', '−', '×', '÷'] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => applyOperator(op === '−' ? '-' : op === '×' ? '*' : op === '÷' ? '/' : op)}
                      className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-text-secondary hover:bg-white/[0.08] hover:text-text-primary active:scale-95"
                      aria-label={`Operator ${op}`}
                    >
                      {op}
                    </button>
                  ))}
                  {mathLiveResult !== null && (
                    <button
                      type="button"
                      onClick={evaluateAndSetAmount}
                      className="flex h-6 px-1.5 items-center justify-center rounded bg-accent/20 text-xs font-bold text-accent hover:bg-accent hover:text-white active:scale-95"
                      aria-label="Hitung"
                    >
                      =
                    </button>
                  )}
                </div>

                {[10000, 20000, 50000, 100000, 200000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => addQuickAmount(amt)}
                    className="rounded-lg border border-border-outer bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-text-secondary transition hover:border-accent/40 hover:text-text-primary active:scale-95"
                  >
                    +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
                  </button>
                ))}
                {amountText && (
                  <button
                    type="button"
                    onClick={() => setAmountText('')}
                    className="rounded-lg border border-border-outer bg-white/[0.03] px-2 py-1 text-[11px] text-text-secondary hover:text-danger active:scale-95"
                  >
                    Hapus
                  </button>
                )}
              </div>
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

            <DateTransactionPicker
              dateText={dateText}
              setDateText={setDateText}
              isReceiptDate={Boolean(activeScan?.detected_date && activeScan.detected_date === dateText)}
            />

            <NoteWithTags
              noteText={noteText}
              setNoteText={setNoteText}
            />

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
                    try {
                      localStorage.setItem('kasdesk:last-wallet', e.target.value)
                    } catch {}
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
              <p role="alert" className="text-xs text-danger">
                {error}
              </p>
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
