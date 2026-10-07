'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createWallet } from '@/lib/actions'
import { SUPPORTED_CURRENCIES, CURRENCY_METAS } from '@/lib/currency'

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
  const [balance, setBalance] = useState('0')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function onBalanceChange(v: string) {
    const digits = v.replace(/[^\d]/g, '')
    if (!digits) {
      setBalance('0')
      return
    }
    const clean = digits.replace(/^0+(?=\d)/, '')
    setBalance(clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.') || '0')
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const res = await createWallet({
      name: String(fd.get('name') ?? ''),
      type: String(fd.get('type') ?? 'cash') as (typeof TYPES)[number],
      currency: String(fd.get('currency') ?? 'IDR'),
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
          <div className="grid grid-cols-2 gap-3">
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
              <label htmlFor="w-curr" className="mb-1 block text-xs text-text-secondary">Mata Uang</label>
              <select
                id="w-curr"
                name="currency"
                defaultValue="IDR"
                className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c} ({CURRENCY_METAS[c].symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="w-balance" className="mb-1 block text-xs text-text-secondary">
              Saldo awal (Rp)
            </label>
            <input
              id="w-balance"
              name="balance"
              inputMode="numeric"
              value={balance}
              onChange={(e) => onBalanceChange(e.target.value)}
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
