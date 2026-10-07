'use client'

import { hapticTap } from '@/lib/haptics'

export function CalculatorBar({
  mathLiveResult,
  amountText,
  onApplyOperator,
  onEvaluate,
  onAddQuickAmount,
  onClear,
}: {
  mathLiveResult: number | null
  amountText: string
  onApplyOperator: (op: string) => void
  onEvaluate: () => void
  onAddQuickAmount: (val: number) => void
  onClear: () => void
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1 rounded-lg border border-border-outer bg-white/[0.02] p-0.5">
        {(['+', '−', '×', '÷'] as const).map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => {
              hapticTap()
              onApplyOperator(op === '−' ? '-' : op === '×' ? '*' : op === '÷' ? '/' : op)
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-xs font-semibold text-text-secondary hover:bg-white/[0.08] hover:text-text-primary active:scale-95"
            aria-label={`Operator ${op}`}
          >
            {op}
          </button>
        ))}
        {mathLiveResult !== null && (
          <button
            type="button"
            onClick={() => {
              hapticTap()
              onEvaluate()
            }}
            className="flex h-6 px-1.5 items-center justify-center rounded bg-accent/20 text-xs font-bold text-accent hover:bg-accent hover:text-white active:scale-95"
            aria-label="Hitung"
          >
            =
          </button>
        )}
      </div>

      {[10000, 20000, 50000, 100000, 200000].map((amt) => (
        <button
          key={amt}
          type="button"
          onClick={() => {
            hapticTap()
            onAddQuickAmount(amt)
          }}
          className="rounded-lg border border-border-outer bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-text-secondary transition hover:border-accent/40 hover:text-text-primary active:scale-95"
        >
          +{amt >= 1000000 ? `${amt / 1000000}jt` : `${amt / 1000}rb`}
        </button>
      ))}
      {amountText && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-border-outer bg-white/[0.03] px-2 py-1 text-[11px] text-text-secondary hover:text-danger active:scale-95"
        >
          Hapus
        </button>
      )}
    </div>
  )
}
