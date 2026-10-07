import { Coins, PiggyBank } from 'lucide-react'
import { formatIDR } from '@/lib/format'
import type { RoundUpResult, PayYourselfFirstResult } from '@/lib/micro-savings'

export function QuickLogSavingsBadges({
  roundUpInfo,
  roundUpStep,
  payFirstSuggestion,
}: {
  roundUpInfo: RoundUpResult | null
  roundUpStep: number
  payFirstSuggestion: PayYourselfFirstResult | null
}) {
  return (
    <>
      {roundUpInfo && roundUpInfo.spareChange > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 animate-fade-in-up">
          <span className="flex items-center gap-1.5 font-medium">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            Celengan ({formatIDR(roundUpStep)}):
          </span>
          <span className="font-mono font-semibold text-amber-300">
            +{formatIDR(roundUpInfo.spareChange)} ke Tabungan
          </span>
        </div>
      )}

      {payFirstSuggestion && payFirstSuggestion.isEligible && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-accent-income/30 bg-accent-income/10 px-3 py-1.5 text-xs text-accent-income animate-fade-in-up">
          <span className="flex items-center gap-1.5 font-medium">
            <PiggyBank className="h-3.5 w-3.5" />
            Saran Tabung Dulu (15%):
          </span>
          <span className="font-mono font-semibold">
            {formatIDR(payFirstSuggestion.recommendedAmount)}
          </span>
        </div>
      )}
    </>
  )
}
