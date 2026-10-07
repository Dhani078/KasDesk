'use client'

import { useState } from 'react'
import { Landmark, Globe, Coins, Bitcoin, TrendingUp } from 'lucide-react'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import {
  calculateNetWorth,
  type NetWorthRollup,
} from '@/lib/currency'

export function NetWorthCard({
  wallets,
}: {
  wallets: Array<{ id: string; name: string; balance: number; currency?: string }>
}) {
  const [rollup] = useState<NetWorthRollup>(() => calculateNetWorth(wallets))

  const hasNonIDR =
    rollup.breakdown.forex > 0 || rollup.breakdown.gold > 0 || rollup.breakdown.crypto > 0

  if (!hasNonIDR && wallets.length <= 1) return null

  return (
    <div className="surface-card mb-6 rounded-3xl border border-border-outer p-5">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/15 text-accent">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-semibold text-text-primary">Kekayaan Bersih (Net Worth)</h2>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-text-primary tabular-nums">
            <PrivacyAmount value={rollup.totalNetWorth} />
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary bg-canvas/60 px-2.5 py-1 rounded-xl border border-border-inner">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Kurs Acuan: USD Rp 16.200 · Emas Rp 1.45M/g</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-border-inner">
        <div className="rounded-xl border border-border-inner bg-canvas/30 p-2.5">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span className="flex items-center gap-1">
              <Landmark className="h-3.5 w-3.5 text-emerald-400" />
              Kas IDR
            </span>
            <span className="font-mono text-[10px] font-semibold text-emerald-400">
              {rollup.percentages.fiatIDR}%
            </span>
          </div>
          <p className="font-mono text-xs font-semibold text-text-primary">
            <PrivacyAmount value={rollup.breakdown.fiatIDR} />
          </p>
        </div>

        <div className="rounded-xl border border-border-inner bg-canvas/30 p-2.5">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              Valas Forex
            </span>
            <span className="font-mono text-[10px] font-semibold text-blue-400">
              {rollup.percentages.forex}%
            </span>
          </div>
          <p className="font-mono text-xs font-semibold text-text-primary">
            <PrivacyAmount value={rollup.breakdown.forex} />
          </p>
        </div>

        <div className="rounded-xl border border-border-inner bg-canvas/30 p-2.5">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              Emas Fisik
            </span>
            <span className="font-mono text-[10px] font-semibold text-amber-400">
              {rollup.percentages.gold}%
            </span>
          </div>
          <p className="font-mono text-xs font-semibold text-text-primary">
            <PrivacyAmount value={rollup.breakdown.gold} />
          </p>
        </div>

        <div className="rounded-xl border border-border-inner bg-canvas/30 p-2.5">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span className="flex items-center gap-1">
              <Bitcoin className="h-3.5 w-3.5 text-purple-400" />
              Kripto
            </span>
            <span className="font-mono text-[10px] font-semibold text-purple-400">
              {rollup.percentages.crypto}%
            </span>
          </div>
          <p className="font-mono text-xs font-semibold text-text-primary">
            <PrivacyAmount value={rollup.breakdown.crypto} />
          </p>
        </div>
      </div>
    </div>
  )
}
