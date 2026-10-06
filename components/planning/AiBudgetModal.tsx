'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Check, RefreshCw, X, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import {
  generateAiBudgetRecommendations,
  type CategorySpending,
  type BudgetRecommendation,
} from '@/lib/planning/ai-budget'
import { applyAiBudgetBatchAction } from '@/lib/planning/actions'
import { formatIDR } from '@/lib/format'
import { useRouter } from 'next/navigation'

export function AiBudgetModal({
  month,
  monthlyIncome,
  categorySpendings,
}: {
  month: string
  monthlyIncome: number
  categorySpendings: CategorySpending[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<BudgetRecommendation[]>([])
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const router = useRouter()

  const handleOpen = () => {
    const recs = generateAiBudgetRecommendations({ monthlyIncome, categorySpendings })
    setItems(recs)
    setErrorMsg('')
    setSuccessMsg('')
    setIsOpen(true)
  }

  const handleUpdateAmount = (cat: string, newAmt: number) => {
    setItems((prev) =>
      prev.map((item) => (item.category === cat ? { ...item, recommendedLimit: Math.max(0, newAmt) } : item)),
    )
  }

  const handleApply = () => {
    setErrorMsg('')
    startTransition(async () => {
      const res = await applyAiBudgetBatchAction({
        month,
        items: items.map((i) => ({ category: i.category, amount: i.recommendedLimit })),
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menerapkan budget AI')
        return
      }

      setSuccessMsg(`Berhasil! ${res.count} kategori budget otomatis diterapkan untuk bulan ${month}.`)
      router.refresh()
      setTimeout(() => {
        setIsOpen(false)
      }, 1500)
    })
  }

  const totalRecommended = items.reduce((s, i) => s + i.recommendedLimit, 0)

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 active:scale-95 cursor-pointer"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI Saran Budget (50/30/20)
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsOpen(false)
          }}
        >
          <div className="surface-card w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-border-outer space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-inner">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !h-9 !w-9 text-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">Rekomendasi Budget AI</h3>
                  <p className="text-xs text-text-secondary">Formula 50/30/20 disesuaikan dengan pola spending {month}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-white/[0.05]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Income / Allocation summary */}
            <div className="rounded-2xl border border-border-outer bg-canvas p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-text-secondary block">Total Alokasi AI:</span>
                <span className="font-mono font-semibold text-sm text-text-primary">{formatIDR(totalRecommended)}</span>
              </div>
              <div className="text-right">
                <span className="text-text-secondary block">Basis Arus Kas:</span>
                <span className="font-mono text-text-primary">
                  {monthlyIncome > 0 ? formatIDR(monthlyIncome) : 'Estimasi Pengeluaran'}
                </span>
              </div>
            </div>

            {/* Error & Success Alerts */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-accent-income/30 bg-accent-income/10 p-3 text-xs text-accent-income">
                <Check className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Recommendations List */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.category}
                  className="rounded-2xl border border-border-outer bg-white/[0.02] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">#{item.category}</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <p className="text-[11px] text-text-secondary">{item.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-text-secondary text-[11px]">Limit:</span>
                    <input
                      type="number"
                      step="25000"
                      min="50000"
                      value={item.recommendedLimit}
                      onChange={(e) => handleUpdateAmount(item.category, parseInt(e.target.value, 10) || 0)}
                      disabled={isPending}
                      className="w-28 rounded-xl border border-border-outer bg-canvas px-2.5 py-1.5 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleApply}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-solid py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Terapkan Semua Budget AI</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
