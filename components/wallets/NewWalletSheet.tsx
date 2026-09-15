'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createWallet } from '@/lib/actions'

export const TYPE_LABEL: Record<string, string> = {
  cash: 'Tunai',
  bank: 'Bank',
  e_wallet: 'E-Wallet',
  investment: 'Investasi',
}

export const TYPES = ['cash', 'bank', 'e_wallet', 'investment'] as const

export function NewWalletSheet({ onClose }: { onClose: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const res = await createWallet({
      name: String(fd.get('name') ?? ''),
      type: String(fd.get('type') ?? 'cash') as (typeof TYPES)[number],
      balance: Number(String(fd.get('balance') ?? '0').replace(/[^\d]/g, '')),
    })
    setPending(false)
    if (!res.success) {
      setError(res.error.message)
      return
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dompet baru"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Dompet Baru</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="w-name" className="mb-1 block text-xs text-text-secondary">Nama</label>
            <input
              id="w-name"
              name="name"
              required
              maxLength={60}
              placeholder="Bank BCA"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="w-type" className="mb-1 block text-xs text-text-secondary">Jenis</label>
            <select
              id="w-type"
              name="type"
              defaultValue="cash"
              className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="w-balance" className="mb-1 block text-xs text-text-secondary">
              Saldo awal (Rp)
            </label>
            <input
              id="w-balance"
              name="balance"
              inputMode="numeric"
              defaultValue="0"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
            />
          </div>

          {error && <p role="alert" className="text-xs text-danger">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </form>
      </div>
    </div>
  )
}
