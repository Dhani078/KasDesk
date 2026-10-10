'use client'

import { Calculator } from 'lucide-react'
import { formatIDR } from '@/lib/format'
import { CalculatorBar } from '@/components/quicklog/CalculatorBar'
import { QuickLogSavingsBadges } from '@/components/quicklog/QuickLogSavingsBadges'
import type { RoundUpConfig, RoundUpResult, PayYourselfFirstResult } from '@/lib/micro-savings'

export function QuickLogAmountSection({
  amountText,
  onAmountChange,
  mathLiveResult,
  evaluateAndSetAmount,
  applyOperator,
  addQuickAmount,
  onClear,
  roundUpInfo,
  roundUpConfig,
  payFirstSuggestion,
}: {
  amountText: string
  onAmountChange: (val: string) => void
  mathLiveResult: number | null
  evaluateAndSetAmount: () => void
  applyOperator: (op: string) => void
  addQuickAmount: (val: number) => void
  onClear: () => void
  roundUpInfo: RoundUpResult | null
  roundUpConfig: RoundUpConfig
  payFirstSuggestion: PayYourselfFirstResult | null
}) {
  return (
    <div>
      <label htmlFor="amount" className="mb-1 block text-xs text-text-secondary">
        Jumlah (Rp)
      </label>
      <input
        id="amount"
        name="amount"
        inputMode="numeric"
        required
        placeholder="0"
        value={amountText}
        onChange={(e) => onAmountChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && mathLiveResult !== null) {
            e.preventDefault()
            evaluateAndSetAmount()
          }
        }}
        className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
      />

      {mathLiveResult !== null && (
        <div className="mt-1.5 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent">
          <span className="flex items-center gap-1.5 font-medium">
            <Calculator className="h-3.5 w-3.5" />
            Hasil: = {formatIDR(mathLiveResult)}
          </span>
          <button
            type="button"
            onClick={evaluateAndSetAmount}
            className="rounded-lg bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white transition hover:opacity-90 active:scale-95"
          >
            Gunakan
          </button>
        </div>
      )}

      <CalculatorBar
        mathLiveResult={mathLiveResult}
        amountText={amountText}
        onApplyOperator={applyOperator}
        onEvaluate={evaluateAndSetAmount}
        onAddQuickAmount={addQuickAmount}
        onClear={onClear}
      />

      <QuickLogSavingsBadges
        roundUpInfo={roundUpInfo}
        roundUpStep={roundUpConfig?.step ?? 5000}
        payFirstSuggestion={payFirstSuggestion}
      />
    </div>
  )
}
