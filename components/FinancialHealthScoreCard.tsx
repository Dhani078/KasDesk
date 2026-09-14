'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, Circle, Sparkles, Trophy } from 'lucide-react'
import type { DashboardSummary } from '@/lib/analytics/actions'

export function FinancialHealthScoreCard({ dash }: { dash: DashboardSummary }) {
  const [expanded, setExpanded] = useState(false)
  const score = dash.healthScore

  const tier =
    score >= 85
      ? {
          name: 'Diamond Tier',
          title: 'Financial Master',
          emoji: '💎',
          color: 'text-cyan-400',
          border: 'border-cyan-500/30',
          bg: 'from-cyan-500/10 via-cyan-500/5 to-surface',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          nextText: 'Level tertinggi tercapai! Pertahankan konsistensimu!',
        }
      : score >= 70
      ? {
          name: 'Gold Tier',
          title: 'Keuangan Stabil & Sehat',
          emoji: '🥇',
          color: 'text-amber-400',
          border: 'border-amber-500/30',
          bg: 'from-amber-500/10 via-amber-500/5 to-surface',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          nextText: `Tinggal ${85 - score} poin lagi untuk naik ke Diamond 💎`,
        }
      : score >= 55
      ? {
          name: 'Silver Tier',
          title: 'Perlu Waspada & Dijaga',
          emoji: '🥈',
          color: 'text-slate-300',
          border: 'border-slate-400/30',
          bg: 'from-slate-400/10 via-slate-400/5 to-surface',
          badge: 'bg-slate-400/20 text-slate-200 border-slate-400/40',
          nextText: `Tinggal ${70 - score} poin lagi untuk naik ke Gold 🥇`,
        }
      : {
          name: 'Bronze Tier',
          title: 'Rawan Bocor',
          emoji: '🥉',
          color: 'text-orange-400',
          border: 'border-orange-500/30',
          bg: 'from-orange-500/10 via-orange-500/5 to-surface',
          badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          nextText: `Tinggal ${55 - score} poin lagi untuk naik ke Silver 🥈`,
        }

  const criteria = [
    {
      title: 'Saldo Dompet Positif',
      pts: '+10',
      ok: dash.totalBalance > 0,
      tip: 'Pastikan ada saldo di dompet aktif.',
    },
    {
      title: 'Pemasukan Rutin Tercatat',
      pts: '+10',
      ok: dash.monthlyIncome > 0,
      tip: 'Catat gaji atau pemasukan bulanan.',
    },
    {
      title: 'Pengeluaran Terkendali (≤ Pemasukan)',
      pts: '+10',
      ok: dash.monthlyExpense <= dash.monthlyIncome || dash.monthlyIncome === 0,
      tip: 'Jaga pengeluaran tidak melebihi uang masuk.',
    },
    {
      title: 'Memiliki Target Tabungan Aktif',
      pts: '+10',
      ok: dash.vaultAllocations > 0,
      tip: 'Buat target tabungan darurat di menu Target.',
    },
    {
      title: 'Beban Utang Terkendali',
      pts: '+8',
      ok: dash.upcomingDebts === 0 || dash.upcomingDebts < Math.max(1, dash.totalBalance) * 0.35,
      tip: 'Jaga utang aktif di bawah 35% total saldo.',
    },
    {
      title: 'Aman Harian Terjaga',
      pts: '+7',
      ok: dash.safeDailySpend > 0,
      tip: 'Sisakan budget aman belanja setiap hari.',
    },
  ]

  return (
    <section className={`surface-card mb-6 rounded-3xl border ${tier.border} bg-gradient-to-br ${tier.bg} p-5 sm:p-6 shadow-sm transition-all`}>
      {/* Top Bar: Tier Badge & Savings Rate */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{tier.emoji}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tier.badge}`}>
            {tier.name}
          </span>
        </div>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-text-secondary border border-border-outer">
          Savings {dash.savingsRate}%
        </span>
      </div>

      {/* Main Score Display */}
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-text-secondary">Financial Health Score</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            {tier.title}
          </h2>
          <p className="mt-1.5 text-xs text-text-secondary flex items-center gap-1.5">
            <Sparkles className={`h-3.5 w-3.5 ${tier.color}`} />
            {tier.nextText}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-text-primary">
            {score}
          </span>
          <span className="text-sm font-semibold text-text-secondary">/100</span>
        </div>
      </div>

      {/* Animated Level Progress Bar */}
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.08] p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            score >= 85
              ? 'bg-gradient-to-r from-cyan-500 to-accent'
              : score >= 70
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
              : score >= 55
              ? 'bg-gradient-to-r from-slate-400 to-slate-200'
              : 'bg-gradient-to-r from-orange-600 to-red-500'
          }`}
          style={{ width: `${Math.max(6, Math.min(100, score))}%` }}
        />
      </div>

      {/* Collapsible Checklist & Gamified Breakdown */}
      <div className="mt-4 border-t border-border-inner pt-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-xs font-medium text-accent hover:underline py-1"
        >
          <span className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            {expanded ? 'Sembunyikan kriteria misi poin' : 'Lihat cara menambah poin skor keuangan'}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="mt-3 space-y-2.5 pt-1">
            {criteria.map((item) => (
              <div
                key={item.title}
                className={`flex items-start justify-between gap-3 rounded-xl p-2.5 text-xs transition ${
                  item.ok ? 'bg-accent-income/10 border border-accent-income/20' : 'bg-white/[0.03] border border-border-outer'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  {item.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-income mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-text-secondary mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${item.ok ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">{item.tip}</p>
                  </div>
                </div>
                <span className={`font-mono font-bold shrink-0 ${item.ok ? 'text-accent-income' : 'text-text-secondary'}`}>
                  {item.pts}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
