'use client'

import { useState, useEffect } from 'react'
import { Calculator, X, Sparkles, ArrowRight } from 'lucide-react'
import { calculateFreelancerTax, PTKP_RATES, type PtkpCode } from '@/lib/tax'
import { formatIDR } from '@/lib/format'

export function TaxEstimatorModal({
  defaultGross,
  onConsultCoach,
}: {
  defaultGross?: number
  onConsultCoach?: (prompt: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [grossInput, setGrossInput] = useState(() => (defaultGross ? formatDots(String(defaultGross)) : '120.000.000'))
  const [norma, setNorma] = useState(50)
  const [ptkp, setPtkp] = useState<PtkpCode>('TK/0')

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  function formatDots(v: string) {
    const digits = v.replace(/\D/g, '')
    if (!digits) return ''
    return digits.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const grossNum = Number(grossInput.replace(/\D/g, '') || 0)
  const result = calculateFreelancerTax(grossNum, norma, ptkp)

  function handleSendToCoach() {
    const prompt = `Saya pekerja lepas dengan omzet bruto tahunan ${formatIDR(result.grossAnnual)}, norma NPPN ${result.normaPercent}%, status ${result.ptkpCode}. Estimasi PPh 21 saya ${formatIDR(result.annualTax)} (${formatIDR(result.monthlyReserve)}/bulan). Bagaimana strategi alokasi kas terbaik agar tidak boncos saat lapor SPT tahunan?`
    if (onConsultCoach) {
      onConsultCoach(prompt)
    } else {
      window.dispatchEvent(new CustomEvent('kasdesk:coach-prompt', { detail: { prompt } }))
    }
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border-outer bg-surface/80 px-3.5 py-2 text-xs font-semibold text-text-primary shadow-sm transition hover:border-accent/40 hover:bg-white/[0.04] active:scale-95 cursor-pointer"
      >
        <Calculator className="h-4 w-4 text-accent" />
        Kalkulator Pajak Freelancer (PPh 21)
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kalkulator Pajak PPh 21 Freelancer NPPN"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-border-outer bg-surface p-6 shadow-2xl animate-fade-in-up my-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-inner pb-3">
              <div className="flex items-center gap-2.5">
                <span className="icon-tile !h-9 !w-9 text-accent">
                  <Calculator className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Simulasi Pajak Freelancer</h3>
                  <p className="text-[11px] text-text-secondary">Skema Norma NPPN DJP (UU HPP)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg cursor-pointer"
                aria-label="Tutup kalkulator"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="tax-gross" className="mb-1 block font-medium text-text-secondary">
                  Omzet Bruto Tahunan (Rp)
                </label>
                <input
                  id="tax-gross"
                  inputMode="numeric"
                  value={grossInput}
                  onChange={(e) => setGrossInput(formatDots(e.target.value))}
                  placeholder="Contoh: 120.000.000"
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 font-mono text-sm text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tax-norma" className="mb-1 block font-medium text-text-secondary">
                    Tarif Norma (NPPN)
                  </label>
                  <select
                    id="tax-norma"
                    value={norma}
                    onChange={(e) => setNorma(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                  >
                    <option value={50}>50% — Jasa TI / Kreator / Profesi Bebas</option>
                    <option value={40}>40% — Jasa Konsultan / Desain</option>
                    <option value={30}>30% — Perdagangan / Retail</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="tax-ptkp" className="mb-1 block font-medium text-text-secondary">
                    Status PTKP (Tanggungan)
                  </label>
                  <select
                    id="tax-ptkp"
                    value={ptkp}
                    onChange={(e) => setPtkp(e.target.value as PtkpCode)}
                    className="w-full rounded-xl border border-border bg-canvas px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                  >
                    {Object.entries(PTKP_RATES).map(([code, p]) => (
                      <option key={code} value={code}>
                        {code} — {formatIDR(p.amount)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Calculation Result Card */}
            <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 border-b border-border-inner pb-3 text-xs">
                <div>
                  <p className="text-text-secondary text-[11px]">Penghasilan Neto ({norma}%)</p>
                  <p className="font-mono font-semibold text-text-primary">{formatIDR(result.netIncome)}</p>
                </div>
                <div>
                  <p className="text-text-secondary text-[11px]">Penghasilan Kena Pajak (PKP)</p>
                  <p className="font-mono font-semibold text-text-primary">{formatIDR(result.taxableIncome)}</p>
                </div>
              </div>

              {/* High-level Tax Output */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-[11px] text-text-secondary">Estimasi Pajak Terutang (1 Tahun)</p>
                  <p className="font-mono text-xl font-bold text-accent">{formatIDR(result.annualTax)}</p>
                  <p className="text-[10px] text-text-secondary">Tarif Efektif: {result.effectiveRatePercent}% dari omzet</p>
                </div>
                <div className="text-right rounded-xl bg-white/[0.04] p-2.5 border border-border-outer">
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">Sisihkan per Bulan</p>
                  <p className="font-mono text-base font-bold text-accent-income">{formatIDR(result.monthlyReserve)}</p>
                </div>
              </div>

              {/* Progress Bar Breakdown */}
              {result.bracketBreakdown.length > 0 && (
                <div className="pt-2 border-t border-border-inner/60 space-y-1.5 text-[11px]">
                  <p className="font-medium text-text-secondary">Rincian Lapisan Tarif (UU HPP):</p>
                  {result.bracketBreakdown.map((b, i) => (
                    <div key={i} className="flex justify-between text-text-secondary">
                      <span>• Lapisan {b.bracket} ({b.rate}%):</span>
                      <span className="font-mono text-text-primary">{formatIDR(b.taxAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consult Coach Action */}
            <button
              type="button"
              onClick={handleSendToCoach}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent-solid py-2.5 px-4 text-xs font-semibold text-white transition hover:brightness-110 active:scale-95 cursor-pointer shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              Tanya Strategi Alokasi Pajak ke AI Coach
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
