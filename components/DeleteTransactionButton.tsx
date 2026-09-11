'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2, X } from 'lucide-react'

import { deleteTransaction } from '@/lib/actions'
import { formatIDR } from '@/lib/format'

export type TxnRow = {
  id: string
  title: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
}

/**
 * Deletes a transaction and reverses its effect on the wallet balance.
 *
 * Confirmation is required: deleting is destructive and the balance change
 * is not undoable from the UI.
 */
export function DeleteTransactionButton({ txn }: { txn: TxnRow }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onDelete() {
    setError(null)
    start(async () => {
      const r = await deleteTransaction(txn.id)
      if (!r.success) {
        setError(r.error.message)
        setConfirm(false)
        return
      }
      setConfirm(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        disabled={pending}
        aria-label={`Hapus ${txn.title}`}
        className="shrink-0 rounded-lg p-1.5 text-text-secondary transition-colors hover:text-danger disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
          onClick={() => setConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Konfirmasi hapus"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border border-border-outer bg-surface p-5"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-text-primary">Hapus transaksi?</h2>
              <button
                type="button"
                onClick={() => setConfirm(false)}
                aria-label="Tutup"
                className="text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-1 text-xs text-text-secondary">{txn.title}</p>
            <p className="mb-4 font-mono text-sm tabular-nums text-text-primary">
              {txn.type === 'income' ? '+' : '−'}
              {formatIDR(txn.amount)}
            </p>
            <p className="mb-4 text-xs leading-relaxed text-text-secondary">
              Saldo dompet akan dikembalikan seperti sebelum transaksi ini dicatat.
            </p>

            {error && (
              <p role="alert" className="mb-3 text-xs text-danger">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(false)}
                className="flex-1 rounded-xl px-3 py-2.5 text-xs text-text-secondary ring-1 ring-border-outer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                className="flex-1 rounded-xl bg-danger px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {pending ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
