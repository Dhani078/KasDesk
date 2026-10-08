'use client'

import { useState, useEffect, useTransition } from 'react'
import { Sparkles, Check, RefreshCw, X, ArrowRight, AlertCircle } from 'lucide-react'
import { evaluateVaultFeasibility, type VaultFeasibilityResult } from '@/lib/vaults/ai-planner'
import { createVault } from '@/lib/actions'
import { formatIDR } from '@/lib/format'
import { useRouter } from 'next/navigation'

export function AiVaultPlannerModal({
  monthlyIncome = 0,
  monthlyExpense = 0,
}: {
  monthlyIncome?: number
  monthlyExpense?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState<number>(10_000_000)
  const [targetMonths, setTargetMonths] = useState<number>(6)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, isPending])

  const result: VaultFeasibilityResult = evaluateVaultFeasibility({
    targetAmount,
    targetMonths,
    monthlyIncome,
    monthlyExpense,
  })

  const handleCreateVault = () => {
    if (!name.trim()) {
      setErrorMsg('Nama target tabungan wajib diisi')
      return
    }

    setErrorMsg('')
    startTransition(async () => {
      const targetDate = new Date()
      targetDate.setMonth(targetDate.getMonth() + targetMonths)

      const res = await createVault({
        name: name.trim(),
        target_amount: targetAmount,
        target_date: targetDate.toISOString(),
      })

      if (!res.success) {
        setErrorMsg(res.error?.message || 'Gagal membuat target tabungan')
        return
      }

      setSuccessMsg(`Target "${name}" berhasil dibuat dengan simulasi AI!`)
      router.refresh()
      setTimeout(() => {
        setIsOpen(false)
        setName('')
        setSuccessMsg('')
      }, 1500)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMsg('')
          setSuccessMsg('')
          setIsOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 active:scale-95 cursor-pointer"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI Simulasi Target
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
          <div className="surface-card w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-border-outer space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-inner">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !h-9 !w-9 text-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">AI Perencana Tabungan</h3>
                  <p className="text-xs text-text-secondary">Uji kelayakan &amp; alokasi setoran berkala</p>
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

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-text-secondary mb-1">Nama Target Tabungan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Dana Darurat, Beli Laptop, Liburan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border-outer bg-canvas px-3 py-2 text-text-primary text-sm focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-text-secondary mb-1">Target Nominal (Rp):</label>
                  <input
                    type="number"
                    step="500000"
                    min="100000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Math.max(100_000, parseInt(e.target.value, 10) || 0))}
                    disabled={isPending}
                    className="w-full rounded-xl border border-border-outer bg-canvas px-3 py-2 font-mono text-text-primary text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary mb-1">Durasi Target (Bulan):</label>
                  <select
                    value={targetMonths}
                    onChange={(e) => setTargetMonths(parseInt(e.target.value, 10))}
                    disabled={isPending}
                    className="w-full rounded-xl border border-border-outer bg-canvas px-3 py-2 text-text-primary text-sm focus:border-accent focus:outline-none"
                  >
                    {[1, 2, 3, 6, 9, 12, 18, 24, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} Bulan
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Feasibility Evaluation Card */}
            <div className="rounded-2xl border border-border-outer bg-canvas p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Kelayakan Finansial:</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    result.verdict === 'SANGAT_REALISTIS'
                      ? 'bg-accent-income/10 text-accent-income border border-accent-income/20'
                      : result.verdict === 'CUKUP_REALISTIS'
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : result.verdict === 'KETAT'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-danger/10 text-danger border border-danger/20'
                  }`}
                >
                  {result.verdict.replace('_', ' ')} ({result.feasibilityScore}/100)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 border-y border-border-inner/60 py-2">
                <div>
                  <span className="text-text-secondary block text-[10px]">Alokasi Bulanan:</span>
                  <span className="font-mono font-semibold text-text-primary">
                    {formatIDR(result.monthlyRequired)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-text-secondary block text-[10px]">Alokasi Mingguan:</span>
                  <span className="font-mono font-semibold text-accent">
                    {formatIDR(result.weeklyRequired)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-text-secondary leading-relaxed">{result.suggestion}</p>
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

            {/* Action Button */}
            <button
              type="button"
              onClick={handleCreateVault}
              disabled={isPending || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-solid py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Buat Target Tabungan Ini</span>
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
