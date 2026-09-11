'use client'

import { useState, useTransition } from 'react'
import { Pencil, Loader2, X } from 'lucide-react'

import { updateTransaction } from '@/lib/actions'
import { CATEGORY_ENUM } from '@/lib/schemas'

export type TxnRow = {
  id: string
  walletId: string | null
  title: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  categoryTag: string | null
  note: string | null
  occurredAt: string
}

/**
 * FR-TXN-4: edit a transaction.
 *
 * Type is immutable (a transfer's wallet pair defines its meaning). Amount,
 * title, category, note are always editable; the source wallet is editable
 * for income/expense only. Editing recomputes wallet balances atomically via
 * updateTransaction (reverses old effect, applies new one).
 */
export function EditTransactionButton({
  txn,
  wallets,
}: {
  txn: TxnRow
  wallets: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Local form state, initialized when the modal opens.
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [cat, setCat] = useState('LAINNYA')
  const [note, setNote] = useState('')
  const [walletId, setWalletId] = useState('')
  const [occurredAt, setOccurredAt] = useState('')

  const isTransfer = txn.type === 'transfer'

  function openModal() {
    setError(null)
    setAmount(String(txn.amount))
    setTitle(txn.title)
    setCat(txn.categoryTag ?? 'LAINNYA')
    setNote(txn.note ?? '')
    setWalletId(txn.walletId ?? '')
    setOccurredAt(txn.occurredAt.slice(0, 16))
    setOpen(true)
  }

  function onSave() {
    setError(null)
    const parsed = {
      wallet_id: isTransfer ? (txn.walletId ?? '') : walletId,
      type: txn.type,
      amount: Number(amount.replace(/\D/g, '')),
      title: title.trim(),
      category_tag: cat,
      note: note.trim() || undefined,
      occurred_at: new Date(occurredAt).toISOString(),
    }
    if (!parsed.amount || parsed.amount <= 0) {
      setError('Jumlah harus lebih dari 0')
      return
    }
    start(async () => {
      const r = await updateTransaction(txn.id, parsed)
      if (!r.success) {
        setError(r.error.message)
        return
      }
      setOpen(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={pending}
        aria-label={`Edit ${txn.title}`}
        className="shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit transaksi"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">
                Edit transaksi {isTransfer ? '(transfer)' : ''}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="text-text-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="e-amount" className="mb-1 block text-xs text-text-secondary">
                  Jumlah (Rp)
                </label>
                <input
                  id="e-amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <label htmlFor="e-title" className="mb-1 block text-xs text-text-secondary">
                  Judul
                </label>
                <input
                  id="e-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
                />
              </div>

              {!isTransfer && (
                <div>
                  <label htmlFor="e-wallet" className="mb-1 block text-xs text-text-secondary">
                    Dompet
                  </label>
                  <select
                    id="e-wallet"
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="e-cat" className="mb-1 block text-xs text-text-secondary">
                  Kategori
                </label>
                <select
                  id="e-cat"
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
                >
                  {CATEGORY_ENUM.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="e-date" className="mb-1 block text-xs text-text-secondary">Tanggal & waktu</label>
                <input id="e-date" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent" />
              </div>

              <div>
                <label htmlFor="e-note" className="mb-1 block text-xs text-text-secondary">
                  Catatan (opsional)
                </label>
                <input
                  id="e-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="Tambah catatan…"
                  className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
                />
              </div>

              <p className="text-xs leading-relaxed text-text-secondary">
                {isTransfer
                  ? 'Transfer: hanya jumlah dan detail yang bisa diubah. Dompet asal & tujuan tetap.'
                  : 'Saldo dompet dihitung ulang otomatis sesuai perubahan.'}
              </p>

              {error && (
                <p role="alert" className="text-xs text-danger">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-text-secondary ring-1 ring-border-outer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pending ? 'Menyimpan…' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}