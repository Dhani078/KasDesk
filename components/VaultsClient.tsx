'use client'

import { useState } from 'react'
import { Target, Plus, X, Loader2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

import { createVault, depositToVault, withdrawFromVault } from '@/lib/actions'
import { formatIDR, formatDate } from '@/lib/format'
import { projectVault } from '@/lib/vaults/projection'
import { EmptyState } from '@/components/EmptyState'

export type VaultLite = {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  isCompleted: number
  targetDate: string | Date | null
}
export type WalletLite = { id: string; name: string; balance: number }

function ProjectionText({ vault }: { vault: VaultLite }) {
  const projection = projectVault(vault.targetAmount, vault.currentAmount, vault.targetDate)
  if (projection.status === 'completed') return <p className="mt-2 text-xs text-accent-income">Target sudah tercapai. Mantap.</p>
  if (!projection.requiredDaily || !projection.requiredWeekly) return <p className="mt-2 text-xs text-text-secondary">Tambahkan tanggal target untuk melihat rencana setoran harian.</p>
  return <p className="mt-2 text-xs leading-5 text-text-secondary">Butuh sekitar <b className="text-text-primary">{formatIDR(projection.requiredDaily)}/hari</b> atau <b className="text-text-primary">{formatIDR(projection.requiredWeekly)}/minggu</b> selama {projection.daysLeft} hari.</p>
}

export function VaultsClient({
  vaults,
  wallets,
}: {
  vaults: VaultLite[]
  wallets: WalletLite[]
}) {
  const [open, setOpen] = useState(false)
  const [move, setMove] = useState<{ vault: VaultLite; dir: 'in' | 'out' } | null>(null)

  const total = vaults.reduce((s, v) => s + Number(v.currentAmount ?? 0), 0)

  return (
    <>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Target Tabungan</h1>
          <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">
            Terkumpul {formatIDR(total)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs text-text-primary ring-1 ring-border-outer"
        >
          <Plus className="h-3.5 w-3.5" /> Target
        </button>
      </div>

      {vaults.length === 0 ? (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title="Belum ada target"
          body="Buat target tabungan, misalnya 'Dana Darurat' atau 'Laptop baru'."
        />
      ) : (
        <ul className="space-y-3">
          {vaults.map((v) => {
            const cur = Number(v.currentAmount)
            const tgt = Number(v.targetAmount)
            const pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 0
            return (
              <li key={v.id} className="rounded-2xl border border-border-outer bg-surface p-4">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-text-primary">
                    {v.name}
                    {v.isCompleted === 1 && (
                      <span className="ml-2 text-xs uppercase tracking-wider text-accent-income">
                        Tercapai
                      </span>
                    )}
                  </p>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-text-secondary">
                    {pct}%
                  </span>
                </div>

                <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-accent-income transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-sm tabular-nums text-text-primary">
                    {formatIDR(cur)}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
                    / {formatIDR(tgt)}
                  </span>
                </div>

                {v.targetDate && (
                  <p className="mt-1 text-xs text-text-secondary">
                    Target {formatDate(v.targetDate)}
                  </p>
                )}
                <ProjectionText vault={v} />

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMove({ vault: v, dir: 'in' })}
                    disabled={wallets.length === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-text-primary ring-1 ring-border-outer disabled:opacity-40"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" /> Setor
                  </button>
                  <button
                    type="button"
                    onClick={() => setMove({ vault: v, dir: 'out' })}
                    disabled={cur <= 0 || wallets.length === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-text-secondary ring-1 ring-border-outer disabled:opacity-40"
                  >
                    <ArrowUpFromLine className="h-3.5 w-3.5" /> Tarik
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {open && <NewVaultSheet onClose={() => setOpen(false)} />}
      {move && (
        <MoveSheet
          vault={move.vault}
          dir={move.dir}
          wallets={wallets}
          onClose={() => setMove(null)}
        />
      )}
    </>
  )
}

function NewVaultSheet({ onClose }: { onClose: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setPending(true)
    const fd = new FormData(e.currentTarget)
    const due = String(fd.get('target_date') ?? '').trim()
    const r = await createVault({
      name: String(fd.get('name') ?? ''),
      target_amount: Number(String(fd.get('target_amount') ?? '0').replace(/[^\d]/g, '')),
      target_date: due ? new Date(due).toISOString() : undefined,
    })
    setPending(false)
    if (!r.success) { setError(r.error.message); return }
    onClose()
  }

  return (
    <Sheet onClose={onClose} title="Target Baru">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Nama target" htmlFor="v-name">
          <input id="v-name" name="name" required maxLength={80} placeholder="Dana Darurat" className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent" />
        </Field>
        <Field label="Jumlah target (Rp)" htmlFor="v-amt">
          <input id="v-amt" name="target_amount" inputMode="numeric" required placeholder="5000000" className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent" />
        </Field>
        <Field label="Target tercapai pada (opsional)" htmlFor="v-date">
          <input id="v-date" name="target_date" type="date" className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent" />
        </Field>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <Submit pending={pending} label="Simpan" />
      </form>
    </Sheet>
  )
}

function MoveSheet({ vault, dir, wallets, onClose }: { vault: VaultLite; dir: 'in' | 'out'; wallets: WalletLite[]; onClose: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const remaining = Number(vault.targetAmount) - Number(vault.currentAmount)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setPending(true)
    const fd = new FormData(e.currentTarget)
    const walletId = String(fd.get('wallet_id') ?? '')
    const amount = Number(String(fd.get('amount') ?? '0').replace(/[^\d]/g, ''))
    const r = dir === 'in' ? await depositToVault(vault.id, walletId, amount) : await withdrawFromVault(vault.id, walletId, amount)
    setPending(false)
    if (!r.success) { setError(r.error.message); return }
    onClose()
  }

  return (
    <Sheet onClose={onClose} title={dir === 'in' ? `Setor ke ${vault.name}` : `Tarik dari ${vault.name}`}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Dompet" htmlFor="m-wallet">
          <select id="m-wallet" name="wallet_id" required defaultValue={wallets[0]?.id ?? ''} className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent">
            {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} — {formatIDR(w.balance)}</option>)}
          </select>
        </Field>
        <Field label="Jumlah (Rp)" htmlFor="m-amt">
          <input id="m-amt" name="amount" inputMode="numeric" required defaultValue={dir === 'in' ? Math.max(0, remaining) : Number(vault.currentAmount)} className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent" />
        </Field>
        {dir === 'in' && remaining > 0 && <p className="text-xs text-text-secondary">Kurang {formatIDR(remaining)} lagi untuk mencapai target.</p>}
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        <Submit pending={pending} label={dir === 'in' ? 'Setor' : 'Tarik'} />
      </form>
    </Sheet>
  )
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}><div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"><div className="mb-4 flex items-center justify-between"><h2 className="truncate pr-2 text-base font-semibold text-text-primary">{title}</h2><button type="button" onClick={onClose} aria-label="Tutup" className="text-text-secondary"><X className="h-5 w-5" /></button></div>{children}</div></div>
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-1 block text-xs text-text-secondary">{label}</label>{children}</div>
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending && <Loader2 className="h-4 w-4 animate-spin" />}{pending ? 'Memproses…' : label}</button>
}
