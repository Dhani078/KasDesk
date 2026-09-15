'use client'

import { useState, useTransition } from 'react'
import { Pencil, Loader2, X, Calculator } from 'lucide-react'

import { updateTransaction } from '@/lib/actions'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { formatIDR } from '@/lib/format'
import { evaluateMathExpression, hasMathOperator } from '@/lib/calculator'
import { NoteWithTags } from '@/components/quicklog/NoteWithTags'

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

  const mathLiveResult = hasMathOperator(amount) ? evaluateMathExpression(amount) : null

  function applyCalc() {
    if (mathLiveResult !== null) {
      setAmount(String(mathLiveResult))
    }
  }

  function onSave() {
    setError(null)
    let parsedAmt = Number(amount.replace(/\D/g, ''))
    if (hasMathOperator(amount)) {
      const calcResult = evaluateMathExpression(amount)
      if (calcResult !== null && calcResult > 0) {
        parsedAmt = calcResult
      }
    }
    const parsed = {
      wallet_id: isTransfer ? (txn.walletId ?? '') : walletId,
      type: txn.type,
      amount: parsedAmt,
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
                  onChange={(e) => {
                    const val = e.target.value
                    if (/[+\-*/xX×÷]/.test(val)) {
                      setAmount(val)
                    } else {
                      setAmount(val.replace(/\D/g, ''))
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
                      onClick={applyCalc}
                      className="rounded-lg bg-accent px-2 py-0.5 text-[11px] font-semibold text-white transition hover:opacity-90 active:scale-95"
                    >
                      Gunakan
                    </button>
                  </div>
                )}
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

              <NoteWithTags noteText={note} setNoteText={setNote} />

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