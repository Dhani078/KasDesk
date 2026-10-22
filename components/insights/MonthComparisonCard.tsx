'use client'

import { useState } from 'react'
import { Scale, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react'
import type { MonthComparisonResult } from '@/lib/analytics/comparison'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import { formatIDR } from '@/lib/format'
import { hapticTap } from '@/lib/haptics'

export function MonthComparisonCard({ data }: { data: MonthComparisonResult }) {
  const [expanded, setExpanded] = useState(false)
  const { currentTotal, previousTotal, diffAmount, diffPercentage, trend, categories, biggestSpike, biggestSaving } = data

  const isUp = trend === 'up'
  const isDown = trend === 'down'

  return (
    <article className="surface-card mb-6 rounded-3xl p-5 sm:p-6 space-y-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile !h-9 !w-9 text-accent">
            <Scale className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Perbandingan Bulan Lalu</h2>
            <p className="text-xs text-text-secondary">Evaluasi pengeluaran vs bulan sebelumnya</p>
          </div>
        </div>

        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1 ${
            isUp
              ? 'bg-accent-expense/15 text-accent-expense border-accent-expense/30'
              : isDown
              ? 'bg-accent-income/15 text-accent-income border-accent-income/30'
              : 'bg-white/[0.06] text-text-secondary border-border-outer'
          }`}
        >
          {isUp ? <TrendingUp className="h-3 w-3" /> : isDown ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {isUp ? `+${diffPercentage}%` : isDown ? `${diffPercentage}%` : '0%'}
        </span>
      </div>

      {/* Main Totals Comparison */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
              <PrivacyAmount value={currentTotal} />
            </span>
            <span className="text-xs text-text-secondary">
              (Bulan lalu: <PrivacyAmount value={previousTotal} />)
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {isUp
              ? `Pengeluaran naik ${formatIDR(diffAmount)} dibanding periode lalu.`
              : isDown
              ? `Hemat ${formatIDR(Math.abs(diffAmount))} dibanding pengeluaran bulan lalu.`
              : 'Pengeluaran sama persis dengan bulan lalu.'}
          </p>
        </div>

        {/* Insight Badges */}
        <div className="flex flex-col gap-1.5 text-xs shrink-0">
          {biggestSpike && (
            <div className="rounded-xl border border-danger/25 bg-danger/10 px-2.5 py-1 text-[11px] text-danger font-medium flex items-center gap-1.5">
              <span>🔥</span>
              <span>
                Kenaikan terbesar: <strong>#{biggestSpike.category}</strong> (+{formatIDR(biggestSpike.amount)})
              </span>
            </div>
          )}
          {biggestSaving && (
            <div className="rounded-xl border border-accent-income/25 bg-accent-income/10 px-2.5 py-1 text-[11px] text-accent-income font-medium flex items-center gap-1.5">
              <span>🟢</span>
              <span>
                Hemat terbesar: <strong>#{biggestSaving.category}</strong> (-{formatIDR(biggestSaving.amount)})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown Toggle */}
      {categories.length > 0 && (
        <div className="border-t border-border-inner pt-3">
          <button
            type="button"
            onClick={() => {
              hapticTap()
              setExpanded(!expanded)
            }}
            aria-expanded={expanded}
            aria-label={expanded ? 'Sembunyikan rincian per kategori' : 'Lihat perbandingan per kategori'}
            className="flex w-full items-center justify-between text-xs font-medium text-accent hover:underline py-1"
          >
            <span>{expanded ? 'Sembunyikan rincian per kategori' : 'Lihat perbandingan per kategori'}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expanded && (
            <ul className="mt-3 divide-y divide-border-inner text-xs animate-fade-in-up">
              {categories.map((c) => {
                const cUp = c.trend === 'up'
                const cDown = c.trend === 'down'
                return (
                  <li key={c.category} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary truncate">{c.category}</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        Bulan lalu: <PrivacyAmount value={c.previousAmount} />
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono font-semibold text-text-primary">
                        <PrivacyAmount value={c.currentAmount} />
                      </p>
                      <span
                        className={`inline-block mt-0.5 font-mono text-[10px] font-bold ${
                          cUp
                            ? 'text-accent-expense'
                            : cDown
                            ? 'text-accent-income'
                            : 'text-text-secondary'
                        }`}
                      >
                        {cUp ? `+${c.diffPercentage}%` : cDown ? `${c.diffPercentage}%` : '0%'}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}
