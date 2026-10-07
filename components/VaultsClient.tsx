'use client'

import { useState, useEffect, useTransition } from 'react'
import { Target, Plus, Loader2, ArrowDownToLine, ArrowUpFromLine, Trash2, Coins } from 'lucide-react'

import { deleteVault } from '@/lib/actions'
import { formatIDR, formatDate } from '@/lib/format'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import { projectVault } from '@/lib/vaults/projection'
import { EmptyState } from '@/components/EmptyState'
import { AiVaultPlannerModal } from '@/components/vaults/AiVaultPlannerModal'
import { RoundUpSettingsModal } from '@/components/vaults/RoundUpSettingsModal'
import { getLocalRoundUpConfig, type RoundUpConfig } from '@/lib/micro-savings'
import { NewVaultSheet, MoveSheet } from '@/components/vaults/VaultSheets'

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
  return <p className="mt-2 text-xs leading-5 text-text-secondary">Butuh sekitar <b className="text-text-primary"><PrivacyAmount value={projection.requiredDaily} />/hari</b> atau <b className="text-text-primary"><PrivacyAmount value={projection.requiredWeekly} />/minggu</b> selama {projection.daysLeft} hari.</p>
}

export function VaultsClient({
  vaults,
  wallets,
  monthlyIncome = 0,
  monthlyExpense = 0,
}: {
  vaults: VaultLite[]
  wallets: WalletLite[]
  monthlyIncome?: number
  monthlyExpense?: number
}) {
  const [open, setOpen] = useState(false)
  const [move, setMove] = useState<{ vault: VaultLite; dir: 'in' | 'out' } | null>(null)
  const [roundUpConfig, setRoundUpConfig] = useState<RoundUpConfig>(() => getLocalRoundUpConfig())

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<RoundUpConfig>
      if (custom.detail) setRoundUpConfig(custom.detail)
    }
    window.addEventListener('kasdesk:roundup-config-change', handler)
    return () => window.removeEventListener('kasdesk:roundup-config-change', handler)
  }, [])

  const total = vaults.reduce((s, v) => s + Number(v.currentAmount ?? 0), 0)
  const activeRoundUpVault = vaults.find((v) => v.id === roundUpConfig?.targetVaultId)

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Target Tabungan</h1>
          <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">
            Terkumpul <PrivacyAmount value={total} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RoundUpSettingsModal vaults={vaults} />
          <AiVaultPlannerModal monthlyIncome={monthlyIncome} monthlyExpense={monthlyExpense} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs text-text-primary ring-1 ring-border-outer transition hover:border-accent/40 active:scale-95 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Target
          </button>
        </div>
      </div>

      {roundUpConfig?.enabled && activeRoundUpVault && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Celengan Aktif: Pembulatan ke <b>{formatIDR(roundUpConfig.step)}</b> dialokasikan ke <b>{activeRoundUpVault.name}</b>
            </span>
          </div>
        </div>
      )}

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
                      <span className="ml-2 inline-flex items-center gap-1 text-xs uppercase tracking-wider text-accent-income">
                        <svg className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L20.18 9l-5 4.36L16.55 20 12 16.27 7.45 20l1.37-6.64-5-4.36 6.09-.74z"/></svg>
                        Tercapai 🎉
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
                    <PrivacyAmount value={cur} />
                  </span>
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
                    / <PrivacyAmount value={tgt} />
                  </span>
                </div>

                {v.targetDate && (
                  <p className="mt-1 text-xs text-text-secondary">
                    Target {formatDate(v.targetDate)}
                  </p>
                )}
                <ProjectionText vault={v} />

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMove({ vault: v, dir: 'in' })}
                    disabled={wallets.length === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-text-primary ring-1 ring-border-outer transition hover:bg-white/[0.04] disabled:opacity-40"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" /> Setor
                  </button>
                  <button
                    type="button"
                    onClick={() => setMove({ vault: v, dir: 'out' })}
                    disabled={cur <= 0 || wallets.length === 0}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-text-secondary ring-1 ring-border-outer transition hover:bg-white/[0.04] disabled:opacity-40"
                  >
                    <ArrowUpFromLine className="h-3.5 w-3.5" /> Tarik
                  </button>
                  <DeleteVaultButton vault={v} />
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

function DeleteVaultButton({ vault }: { vault: VaultLite }) {
  const [pending, start] = useTransition()

  function onDelete() {
    if (Number(vault.currentAmount) > 0) {
      alert('Tarik semua saldo target ke dompet terlebih dahulu sebelum menghapus target ini.')
      return
    }
    if (!window.confirm(`Hapus target tabungan "${vault.name}"?`)) return

    start(async () => {
      const res = await deleteVault(vault.id)
      if (!res.success) {
        alert(res.error.message)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      title="Hapus target"
      aria-label={`Hapus ${vault.name}`}
      className="shrink-0 rounded-lg p-2 text-text-secondary transition hover:bg-white/[0.04] hover:text-danger disabled:opacity-40"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  )
}
