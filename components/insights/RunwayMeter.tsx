'use client'

import { Shield } from 'lucide-react'
import { PrivacyAmount } from '@/components/PrivacyAmount'

export function RunwayMeter({
  totalBalance,
  monthlyExpense,
  weeklyTotal,
}: {
  totalBalance: number
  monthlyExpense: number
  weeklyTotal: number
}) {
  // Estimated monthly burn rate (fallback to 30-day projection of 7-day flow if month just started)
  const monthlyBurn =
    monthlyExpense > 0
      ? monthlyExpense
      : weeklyTotal > 0
      ? Math.round((weeklyTotal / 7) * 30)
      : 0

  const runwayMonths =
    monthlyBurn > 0
      ? Math.min(60, Number((totalBalance / monthlyBurn).toFixed(1)))
      : totalBalance > 0
      ? 12
      : 0

  const status =
    runwayMonths >= 12
      ? {
          tier: 'Sangat Aman 💎',
          desc: 'Cadangan likuid mampu bertahan lebih dari 1 tahun tanpa pemasukan baru.',
          badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
          barColor: 'bg-cyan-400',
          pct: 100,
        }
      : runwayMonths >= 6
      ? {
          tier: 'Aman & Ideal 🟢',
          desc: 'Cadangan likuid memenuhi standar emas dana darurat finansial (6–12 bulan).',
          badge: 'bg-accent-income/15 text-accent-income border-accent-income/30',
          barColor: 'bg-accent-income',
          pct: Math.round((runwayMonths / 12) * 100),
        }
      : runwayMonths >= 3
      ? {
          tier: 'Cukup Terkendali 🟡',
          desc: 'Cukup untuk 3–6 bulan kebutuhan dasar. Tingkatkan alokasi ke brankas/vault darurat.',
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          barColor: 'bg-amber-400',
          pct: Math.round((runwayMonths / 12) * 100),
        }
      : {
          tier: 'Perlu Perhatian 🔴',
          desc: 'Daya tahan likuid di bawah 3 bulan. Prioritaskan penghematan belanja diskresioner.',
          badge: 'bg-danger/15 text-danger border-danger/30',
          barColor: 'bg-danger',
          pct: Math.max(10, Math.round((runwayMonths / 12) * 100)),
        }

  return (
    <article className="surface-card mb-6 rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile !h-9 !w-9 text-accent">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Daya Tahan Dana Darurat (Runway)</h2>
            <p className="text-xs text-text-secondary">Estimasi waktu bertahan tanpa pemasukan baru</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.badge}`}>
          {status.tier}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
              {runwayMonths}
            </span>
            <span className="text-sm font-semibold text-text-secondary">Bulan</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary max-w-md leading-relaxed">{status.desc}</p>
        </div>

        <div className="text-right sm:border-l sm:border-border-inner sm:pl-4 text-xs text-text-secondary shrink-0">
          <p>Burn Rate Bulanan:</p>
          <p className="font-mono font-semibold text-text-primary text-sm mt-0.5">
            <PrivacyAmount value={monthlyBurn} />
          </p>
        </div>
      </div>

      {/* Visual meter bar */}
      <div className="space-y-1.5 pt-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.barColor}`}
            style={{ width: `${Math.min(100, status.pct)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-secondary/70 font-mono">
          <span>0 bln</span>
          <span>3 bln (Waspada)</span>
          <span>6 bln (Standar)</span>
          <span>12+ bln (Optimal)</span>
        </div>
      </div>
    </article>
  )
}
