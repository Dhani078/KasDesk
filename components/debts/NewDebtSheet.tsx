'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createDebt } from '@/lib/actions'

export function NewDebtSheet({ onClose }: { onClose: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const due = String(fd.get('due_date') ?? '').trim()
    const r = await createDebt({
      direction: String(fd.get('direction') ?? 'utang') as 'utang' | 'piutang',
      person_name: String(fd.get('person_name') ?? ''),
      amount: Number(String(fd.get('amount') ?? '0').replace(/[^\d]/g, '')),
      note: String(fd.get('note') ?? '').trim() || undefined,
      due_date: due ? new Date(due).toISOString() : undefined,
    })
    setPending(false)
    if (!r.success) {
      setError(r.error.message)
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
        aria-label="Catat utang"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Catat Utang / Piutang</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="d-dir" className="mb-1 block text-xs text-text-secondary">Jenis</label>
            <select
              id="d-dir"
              name="direction"
              defaultValue="utang"
              className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
            >
              <option value="utang">Utang saya (saya berhutang)</option>
              <option value="piutang">Piutang saya (orang berhutang)</option>
            </select>
          </div>
          <div>
            <label htmlFor="d-person" className="mb-1 block text-xs text-text-secondary">Nama orang</label>
            <input
              id="d-person"
              name="person_name"
              required
              maxLength={80}
              placeholder="Budi"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="d-amount" className="mb-1 block text-xs text-text-secondary">Jumlah (Rp)</label>
            <input
              id="d-amount"
              name="amount"
              inputMode="numeric"
              required
              placeholder="50000"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="d-due" className="mb-1 block text-xs text-text-secondary">
              Jatuh tempo (opsional)
            </label>
            <input
              id="d-due"
              name="due_date"
              type="date"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="d-note" className="mb-1 block text-xs text-text-secondary">Catatan (opsional)</label>
            <input
              id="d-note"
              name="note"
              maxLength={500}
              placeholder="Bayar makan siang"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
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
