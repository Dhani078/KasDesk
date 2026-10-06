'use client'

import { useState, useTransition } from 'react'
import { Check, ArrowRight, RefreshCw, AlertCircle, Wallet } from 'lucide-react'
import { createTransaction } from '@/lib/actions'
import { formatIDR } from '@/lib/format'
import { CATEGORY_ENUM } from '@/lib/schemas'
import { useRouter } from 'next/navigation'

interface TransactionDraft {
  type: 'expense' | 'income'
  amount: number
  categoryTag: string
  notes: string
}

interface WalletItem {
  id: string
  name: string
  balance?: number
}

export function TransactionActionCard({
  draft,
  wallets = [],
}: {
  draft: TransactionDraft
  wallets?: WalletItem[]
}) {
  const [selectedWalletId, setSelectedWalletId] = useState(wallets[0]?.id || '')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleExecute = () => {
    if (!selectedWalletId) {
      setErrorMessage('Pilih dompet terlebih dahulu')
      setStatus('error')
      return
    }

    setErrorMessage('')
    startTransition(async () => {
      const validCategory = CATEGORY_ENUM.includes(draft.categoryTag as (typeof CATEGORY_ENUM)[number])
        ? (draft.categoryTag as (typeof CATEGORY_ENUM)[number])
        : 'LAINNYA'

      const res = await createTransaction({
        wallet_id: selectedWalletId,
        type: draft.type,
        amount: draft.amount,
        title: draft.notes || (draft.type === 'expense' ? 'Pengeluaran Cepat' : 'Pemasukan Cepat'),
        category_tag: validCategory,
        note: `Dicatat via KasDesk AI Coach (${draft.notes})`,
      })

      if (!res.success) {
        setStatus('error')
        setErrorMessage(res.error?.message || 'Gagal menyimpan transaksi')
        return
      }

      setStatus('success')
      router.refresh()
    })
  }

  if (status === 'success') {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-accent-income/40 bg-accent-income/10 p-3 text-xs text-accent-income animate-fade-in">
        <Check className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          Berhasil dicatat ke dompet KasDesk! Saldo otomatis diperbarui.
        </span>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-2xl border border-border-outer bg-canvas/80 p-3.5 text-xs space-y-2.5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border-inner/60 pb-2">
        <span className="flex items-center gap-1.5 font-semibold text-text-primary">
          <Wallet className="h-3.5 w-3.5 text-accent" />
          Konfirmasi Catat Cepat
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            draft.type === 'expense'
              ? 'bg-danger/10 text-danger border border-danger/20'
              : 'bg-accent-income/10 text-accent-income border border-accent-income/20'
          }`}
        >
          {draft.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-text-secondary">
        <div>
          <span className="block text-[10px]">Nominal:</span>
          <span className="font-mono font-semibold text-sm text-text-primary">
            {formatIDR(draft.amount)}
          </span>
        </div>
        <div>
          <span className="block text-[10px]">Kategori:</span>
          <span className="font-medium text-text-primary">#{draft.categoryTag}</span>
        </div>
      </div>

      {wallets.length > 0 && (
        <div>
          <label className="block text-[10px] text-text-secondary mb-1">Pilih Dompet:</label>
          <select
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            disabled={isPending}
            className="w-full rounded-xl border border-border-outer bg-surface px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.balance !== undefined ? `(${formatIDR(w.balance)})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {status === 'error' && errorMessage && (
        <div className="flex items-start gap-1.5 text-[11px] text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleExecute}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-accent-solid py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
      >
        {isPending ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <span>Catat Transaksi Ini</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </>
        )}
      </button>
    </div>
  )
}
