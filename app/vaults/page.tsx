import { Target } from 'lucide-react'

import { getVaults } from '@/lib/actions'
import { formatIDR, formatDate } from '@/lib/format'
import { EmptyState } from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

export default async function VaultsPage() {
  const vaults = await getVaults()
  const total = vaults.reduce((s, v) => s + Number(v.currentAmount ?? 0), 0)

  return (
    <main className="min-h-dvh px-5 pt-8 pb-32">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Target Tabungan</h1>
        <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">
          Terkumpul {formatIDR(total)}
        </p>
      </div>

      {vaults.length === 0 ? (
        <EmptyState
          icon={<Target className="w-6 h-6" />}
          title="Belum ada target"
          body="Buat target tabungan, misalnya 'Dana Darurat' atau 'Laptop baru'."
        />
      ) : (
        <ul className="space-y-3">
          {vaults.map((v) => {
            const pct = v.targetAmount > 0
              ? Math.min(100, Math.round((Number(v.currentAmount) / Number(v.targetAmount)) * 100))
              : 0
            return (
              <li key={v.id} className="rounded-2xl border border-border-outer bg-surface p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-sm font-medium text-text-primary">{v.name}</p>
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
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
                    {formatIDR(v.currentAmount)}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-text-secondary">
                    / {formatIDR(v.targetAmount)}
                  </span>
                </div>
                {v.targetDate && (
                  <p className="mt-1 text-[11px] text-text-secondary">
                    Target {formatDate(v.targetDate)}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
