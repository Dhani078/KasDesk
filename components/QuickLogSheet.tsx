'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

import { createTransaction } from '@/lib/actions'
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
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Catat transaksi"
        className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-2xl bg-text-primary text-canvas shadow-lg"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {open && <Sheet wallets={wallets} onClose={() => setOpen(false)} />}
    </>
  )
}

export function QuickLogButton({ wallets }: { wallets: WalletLite[] }) {
  return <QuickLogSheet wallets={wallets} />
}

function Sheet({ wallets, onClose }: { wallets: WalletLite[]; onClose: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const fd = new FormData(e.currentTarget)
    const res = await createTransaction({
      wallet_id: String(fd.get('wallet_id') ?? ''),
      type: String(fd.get('type') ?? 'expense'),
      amount: Number(String(fd.get('amount') ?? '0').replace(/[^\d]/g, '')),
      title: String(fd.get('title') ?? ''),
      category_tag: String(fd.get('category_tag') ?? 'LAINNYA'),
      note: String(fd.get('note') ?? '') || undefined,
    })

    setPending(false)
    if (!res.success) {
      setError(res.error.message)
      return
    }
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
        className="w-full max-w-md rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Catat Transaksi</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {ok ? (
          <p className="py-8 text-center text-sm text-accent-income">Tersimpan ✓</p>
        ) : wallets.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Buat dompet dulu sebelum mencatat.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
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
                required
                placeholder="35000"
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
                <select
                  id="category_tag"
                  name="category_tag"
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
                >
                  {CATEGORY_ENUM.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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
