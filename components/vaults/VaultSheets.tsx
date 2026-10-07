'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createVault, depositToVault, withdrawFromVault } from '@/lib/actions'
import { formatIDR } from '@/lib/format'
import type { VaultLite, WalletLite } from '@/components/VaultsClient'

export function formatWithDots(raw: string) {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function NewVaultSheet({ onClose }: { onClose: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetAmount, setTargetAmount] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const due = String(fd.get('target_date') ?? '').trim()
    const r = await createVault({
      name: String(fd.get('name') ?? ''),
      target_amount: Number(String(fd.get('target_amount') ?? '0').replace(/[^\d]/g, '')),
      target_date: due ? new Date(due).toISOString() : undefined,
    })
    setPending(false)
    if (!r.success) {
      setError(r.error.message)
      return
    }
    onClose()
  }

  return (
    <Sheet onClose={onClose} title="Target Baru">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Nama target" htmlFor="v-name">
          <input
            id="v-name"
            name="name"
            required
            maxLength={80}
            placeholder="Dana Darurat"
            className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
          />
        </Field>
        <Field label="Jumlah target (Rp)" htmlFor="v-amt">
          <input
            id="v-amt"
            name="target_amount"
            inputMode="numeric"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(formatWithDots(e.target.value))}
            placeholder="Contoh: 5.000.000"
            className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
          />
        </Field>
        <Field label="Target tercapai pada (opsional)" htmlFor="v-date">
          <input
            id="v-date"
            name="target_date"
            type="date"
            className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
          />
        </Field>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <Submit pending={pending} label="Simpan" />
      </form>
    </Sheet>
  )
}

export function MoveSheet({
  vault,
  dir,
  wallets,
  onClose,
}: {
  vault: VaultLite
  dir: 'in' | 'out'
  wallets: WalletLite[]
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remaining = Number(vault.targetAmount) - Number(vault.currentAmount)
  const [amount, setAmount] = useState(
    formatWithDots(String(dir === 'in' ? Math.max(0, remaining) : Number(vault.currentAmount)))
  )

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const walletId = String(fd.get('wallet_id') ?? '')
    const amt = Number(String(fd.get('amount') ?? '0').replace(/[^\d]/g, ''))
    const r = dir === 'in'
      ? await depositToVault(vault.id, walletId, amt)
      : await withdrawFromVault(vault.id, walletId, amt)
    setPending(false)
    if (!r.success) {
      setError(r.error.message)
      return
    }
    onClose()
  }

  return (
    <Sheet onClose={onClose} title={dir === 'in' ? `Setor ke ${vault.name}` : `Tarik dari ${vault.name}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Dompet" htmlFor="m-wallet">
          <select
            id="m-wallet"
            name="wallet_id"
            required
            defaultValue={wallets[0]?.id ?? ''}
            className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — {formatIDR(w.balance)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Jumlah (Rp)" htmlFor="m-amt">
          <input
            id="m-amt"
            name="amount"
            inputMode="numeric"
            required
            value={amount}
            onChange={(e) => setAmount(formatWithDots(e.target.value))}
            className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
          />
        </Field>
        {dir === 'in' && remaining > 0 && (
          <p className="text-xs text-text-secondary">
            Kurang {formatIDR(remaining)} lagi untuk mencapai target.
          </p>
        )}
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <Submit pending={pending} label={dir === 'in' ? 'Setor' : 'Tarik'} />
      </form>
    </Sheet>
  )
}

function Sheet({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="truncate pr-2 text-base font-semibold text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-text-secondary hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  )
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? 'Memproses…' : label}
    </button>
  )
}
