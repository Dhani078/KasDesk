'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, X, Loader2, Archive, ArchiveRestore, Target } from 'lucide-react'

import { archiveWallet } from '@/lib/actions'
import { formatIDR } from '@/lib/format'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import { EmptyState } from '@/components/EmptyState'
import { NewWalletSheet, TYPE_LABEL } from '@/components/wallets/NewWalletSheet'

type WalletLite = {
  id: string
  name: string
  type: string
  balance: number
}

export function WalletsClient({
  wallets,
  archived = [],
}: {
  wallets: WalletLite[]
  archived?: WalletLite[]
}) {
  const [open, setOpen] = useState(false)
  const total = wallets.reduce((s, w) => s + Number(w.balance ?? 0), 0)

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dompet</h1>
          <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">
            Total <PrivacyAmount value={total} />
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs text-text-primary ring-1 ring-border-outer"
        >
          <Plus className="h-3.5 w-3.5" /> Dompet
        </button>
      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border-outer bg-surface/80 p-3.5 shadow-sm transition hover:border-accent/35">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-text-primary">Target Tabungan</p>
            <p className="text-[11px] text-text-secondary">Kelola impian & celengan tabungan</p>
          </div>
        </div>
        <Link
          href="/vaults"
          className="flex items-center gap-1 rounded-xl bg-accent-solid px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
        >
          Buka <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {wallets.length === 0 ? (
        <EmptyState
          title="Belum ada dompet"
          body="Dompet pertama (Tunai) dibuat otomatis saat mendaftar."
        />
      ) : (
        <div className="divide-y divide-border-inner overflow-hidden rounded-2xl border border-border-outer bg-surface">
          {wallets.map((w) => (
            <div key={w.id} className="flex items-center gap-2">
              <Link
                href={`/wallets/${w.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{w.name}</p>
                  <p className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                    {TYPE_LABEL[w.type] ?? w.type}
                  </p>
                </div>
                <span className="font-mono text-sm tabular-nums text-text-primary">
                  <PrivacyAmount value={w.balance} />
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
              </Link>
              <ArchiveButton id={w.id} name={w.name} balance={Number(w.balance ?? 0)} />
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-xs uppercase tracking-[0.08em] text-text-secondary">
            Diarsipkan
          </h2>
          <div className="divide-y divide-border-inner overflow-hidden rounded-2xl border border-dashed border-border-outer bg-surface/50">
            {archived.map((w) => (
              <div key={w.id} className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-secondary">{w.name}</p>
                    <p className="text-xs uppercase tracking-[0.06em] text-text-secondary">
                      {TYPE_LABEL[w.type] ?? w.type}
                    </p>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-text-secondary">
                    <PrivacyAmount value={w.balance} />
                  </span>
                </div>
                <RestoreButton id={w.id} name={w.name} />
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-xs text-text-secondary">
            Dompet yang diarsipkan tidak dihitung dalam Total Saldo.
          </p>
        </section>
      )}

      {open && <NewWalletSheet onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * Archive toggle for one wallet.
 *
 * Guarded behind a confirm step because archiving a wallet with a non-zero
 * balance removes that money from Total Saldo — correct behaviour (the wallet
 * is out of use) but surprising if it happens on a mis-tap.
 */
function ArchiveButton({ id, name, balance }: { id: string; name: string; balance: number }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    setPending(true)
    const res = await archiveWallet(id, true)
    setPending(false)
    if (!res.success) { setError(res.error.message); return }
    setConfirming(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Arsipkan ${name}`}
        className="mr-3 shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Arsipkan ${name}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Arsipkan dompet?</h2>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                aria-label="Tutup"
                className="text-text-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-2 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">{name}</span> tidak akan lagi
              dihitung dalam Total Saldo. Riwayat transaksinya tetap tersimpan.
            </p>
            {balance !== 0 && (
              <p role="alert" className="mb-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-text-secondary">
                Dompet ini masih berisi {formatIDR(balance)}. Jumlah tersebut akan
                hilang dari Total Saldo sampai dompet dipulihkan.
              </p>
            )}

            {error && <p role="alert" className="mb-3 text-xs text-danger">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl px-4 py-3 text-sm text-text-secondary ring-1 ring-border-outer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={run}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {pending ? 'Mengarsipkan…' : 'Arsipkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Restore an archived wallet (undo of ArchiveButton). */
function RestoreButton({ id, name }: { id: string; name: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    setPending(true)
    const res = await archiveWallet(id, false)
    setPending(false)
    if (!res.success) setError(res.error.message)
  }

  return (
    <div className="mr-3 shrink-0">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        aria-label={`Pulihkan ${name}`}
        className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArchiveRestore className="h-4 w-4" />
        )}
        Pulihkan
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  )
}
