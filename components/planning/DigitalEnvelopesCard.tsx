'use client'

import { useState } from 'react'
import { Layers, ShieldCheck, AlertTriangle } from 'lucide-react'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import {
  calculateDigitalEnvelopes,
  type ZeroBasedBudgetSummary,
} from '@/lib/planning/digital-envelopes'

export function DigitalEnvelopesCard({
  monthlyIncome,
  categorySpendings,
}: {
  monthlyIncome: number
  categorySpendings: Record<string, number>
}) {
  const [summary] = useState<ZeroBasedBudgetSummary>(() =>
    calculateDigitalEnvelopes(monthlyIncome, categorySpendings)
  )

  if (summary.monthlyIncome <= 0) return null

  return (
    <div className="surface-card rounded-3xl p-5 mb-8 border border-border-outer">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-accent/15 text-accent">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Amplop Digital (ZBB 50/30/20)</h3>
            <p className="text-xs text-text-secondary">Setiap rupiah dari pendapatan bulanan diberi tugas terencana.</p>
          </div>
        </div>

        <div>
          {summary.isPerfectZBB ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Teralokasi Sempurna (Rp 0 Sisa)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              <PrivacyAmount value={summary.unassignedAmount} /> Belum Diberi Tugas
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {summary.envelopes.map((env) => {
          const isNeeds = env.id === 'needs'
          const isWants = env.id === 'wants'
          const badgeCls = isNeeds
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : isWants
            ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'

          const barCls = env.isOverspent
            ? 'bg-danger'
            : env.burnRatePercentage >= 85
            ? 'bg-amber-400'
            : isNeeds
            ? 'bg-emerald-400'
            : isWants
            ? 'bg-indigo-400'
            : 'bg-amber-400'

          return (
            <div
              key={env.id}
              className={`rounded-2xl border p-4 bg-canvas/40 transition-all ${
                env.isOverspent ? 'border-danger/40 ring-1 ring-danger/20' : 'border-border-inner'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeCls}`}>
                  {env.title}
                </span>
                <span className="font-mono text-xs text-text-secondary">
                  {env.burnRatePercentage}%
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[11px] text-text-secondary">Batas Alokasi</p>
                <p className="font-mono text-sm font-semibold text-text-primary">
                  <PrivacyAmount value={env.allocatedAmount} />
                </p>
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barCls}`}
                  style={{ width: `${Math.min(100, env.burnRatePercentage)}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border-inner">
                <span className="text-text-secondary">
                  {env.isOverspent ? 'Kelebihan:' : 'Tersisa:'}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    env.isOverspent ? 'text-danger' : 'text-accent-income'
                  }`}
                >
                  <PrivacyAmount value={Math.abs(env.remainingAmount)} />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
