'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle2, Sliders, ChevronDown, ChevronUp } from 'lucide-react'
import {
  simulateCashflowForecast,
  type RecurringForecastRule,
} from '@/lib/analytics/forecast'
import { formatIDR } from '@/lib/format'
import { PrivacyAmount } from '@/components/PrivacyAmount'

export function CashflowForecast({
  currentBalance,
  dailyBurnRate,
  recurringRules = [],
}: {
  currentBalance: number
  dailyBurnRate: number
  recurringRules?: RecurringForecastRule[]
}) {
  const [days, setDays] = useState<30 | 60 | 90>(30)
  const [shockOpen, setShockOpen] = useState(false)
  const [shockAmount, setShockAmount] = useState<number>(0)

  const forecast = useMemo(() => {
    return simulateCashflowForecast({
      currentBalance,
      dailyBurnRate,
      recurringRules,
      projectionDays: days,
      criticalThreshold: 500_000,
      oneTimeShockAmount: shockAmount,
      oneTimeShockDay: 3,
    })
  }, [currentBalance, dailyBurnRate, recurringRules, days, shockAmount])

  // SVG Chart Dimensions & Polyline calculation
  const width = 600
  const height = 180
  const paddingX = 20
  const paddingY = 24

  const balances = forecast.points.map((p) => p.balance)
  const minBal = Math.min(0, ...balances)
  const maxBal = Math.max(1, ...balances)
  const range = maxBal - minBal || 1

  const getY = (val: number) => {
    const norm = (val - minBal) / range
    return height - paddingY - norm * (height - paddingY * 2)
  }

  const getX = (idx: number) => {
    return paddingX + (idx / (forecast.points.length - 1)) * (width - paddingX * 2)
  }

  const svgPoints = forecast.points
    .map((p, i) => `${getX(i).toFixed(1)},${getY(p.balance).toFixed(1)}`)
    .join(' ')

  const zeroY = getY(0)
  const thresholdY = getY(forecast.criticalThreshold)

  return (
    <article className="surface-card mb-6 rounded-3xl p-5 sm:p-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile !h-9 !w-9 text-accent">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Proyeksi Arus Kas (Financial Runway)</h2>
            <p className="text-xs text-text-secondary">Simulasi saldo harian berdasarkan burn rate &amp; jadwal rutin</p>
          </div>
        </div>

        {/* Days Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-canvas p-1 border border-border-outer self-start sm:self-auto">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                days === d ? 'bg-accent-solid text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {d} Hari
            </button>
          ))}
        </div>
      </div>

      {/* Critical Date & Overdraft Alerts */}
      {forecast.willOverdraft ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-3.5 flex items-start gap-2.5 text-xs text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Potensi Saldo Minus (Overdraft Terdeteksi)</p>
            <p className="mt-0.5 text-text-secondary text-[11px] leading-relaxed">
              Pada tanggal <strong className="text-danger">{forecast.lowestDate}</strong>, saldo diproyeksikan menyentuh{' '}
              <strong className="text-danger font-mono">{formatIDR(forecast.lowestBalance)}</strong>. Tunda pengeluaran non-prioritas sebesar{' '}
              <strong className="text-text-primary font-mono">{formatIDR(forecast.suggestedDailyCut)}/hari</strong>.
            </p>
          </div>
        </div>
      ) : forecast.criticalDate ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-semibold">Peringatan Batas Kritis (&le; {formatIDR(forecast.criticalThreshold)})</p>
            <p className="mt-0.5 text-text-secondary text-[11px] leading-relaxed">
              Saldo diproyeksikan menembus batas aman dalam <strong className="text-amber-400">{forecast.daysUntilCritical} hari</strong> (pada {forecast.criticalDate}). Titik terendah: <strong className="text-text-primary font-mono">{formatIDR(forecast.lowestBalance)}</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-accent-income/30 bg-accent-income/10 p-3 flex items-center gap-2.5 text-xs text-accent-income">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Arus kas diproyeksikan stabil dan aman hingga {days} hari ke depan.</span>
        </div>
      )}

      {/* Interactive SVG Chart */}
      <div className="relative rounded-2xl border border-border-outer bg-canvas p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible" aria-label="Grafik proyeksi arus kas">
          <defs>
            <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F7FE8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4F7FE8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Zero baseline */}
          {minBal < 0 && (
            <line
              x1={paddingX}
              y1={zeroY}
              x2={width - paddingX}
              y2={zeroY}
              stroke="#E05A47"
              strokeDasharray="4 4"
              strokeWidth="1.2"
              opacity="0.6"
            />
          )}

          {/* Critical Threshold baseline */}
          <line
            x1={paddingX}
            y1={thresholdY}
            x2={width - paddingX}
            y2={thresholdY}
            stroke="#F59E0B"
            strokeDasharray="3 3"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* Curve fill area */}
          <polygon
            points={`${paddingX},${height - paddingY} ${svgPoints} ${width - paddingX},${height - paddingY}`}
            fill="url(#curveGradient)"
          />

          {/* Main Polyline Curve */}
          <polyline
            points={svgPoints}
            fill="none"
            stroke={forecast.willOverdraft ? '#E05A47' : '#4F7FE8'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Highlight Points on Touch / Hover */}
          {forecast.points.map((p, i) => {
            // Sample markers every 5 days or critical days
            if (i % 5 !== 0 && !p.isCritical && i !== forecast.points.length - 1) return null
            const cx = getX(i)
            const cy = getY(p.balance)
            return (
              <circle
                key={p.date}
                cx={cx}
                cy={cy}
                r={p.isCritical ? 3.5 : 2.5}
                className={p.isCritical ? 'fill-amber-400 stroke-canvas' : 'fill-accent stroke-canvas'}
                strokeWidth="1.5"
              />
            )
          })}
        </svg>

        {/* Hover / Point Inspector Bar */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary border-t border-border-inner/60 pt-2">
          <span>Hari ke-0: <strong className="text-text-primary font-mono"><PrivacyAmount value={currentBalance} /></strong></span>
          <span>Titik Terendah: <strong className="text-text-primary font-mono"><PrivacyAmount value={forecast.lowestBalance} /></strong></span>
          <span>Hari ke-{days}: <strong className="text-text-primary font-mono"><PrivacyAmount value={forecast.points.at(-1)?.balance ?? 0} /></strong></span>
        </div>
      </div>

      {/* What-If Simulator Toggle */}
      <div className="rounded-2xl border border-border-outer bg-white/[0.02] p-3 text-xs space-y-2">
        <button
          type="button"
          onClick={() => setShockOpen(!shockOpen)}
          className="w-full flex items-center justify-between font-medium text-text-secondary hover:text-text-primary cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-accent" />
            Simulasi Pengeluaran Ekstra (What-If Shock)
          </span>
          {shockOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {shockOpen && (
          <div className="pt-2 border-t border-border-inner space-y-2 animate-fade-in-up">
            <p className="text-[11px] text-text-secondary">
              Tes ketahanan saldo jika kamu membeli gadget, liburan, atau ada biaya tak terduga:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 1_000_000, 3_000_000, 5_000_000, 10_000_000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setShockAmount(amt)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition ${
                    shockAmount === amt
                      ? 'bg-accent-solid text-white border-accent'
                      : 'border-border-outer bg-white/[0.04] text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {amt === 0 ? 'Normal (Rp 0)' : `+${amt / 1_000_000} Juta`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
