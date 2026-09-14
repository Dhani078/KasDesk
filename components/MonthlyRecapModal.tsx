'use client'

import { useState } from 'react'
import { Check, Copy, FileText, Printer, Share2, X, Sparkles } from 'lucide-react'
import { formatIDR } from '@/lib/format'

export type MonthlyRecapData = {
  monthName: string
  userName: string
  monthlyIncome: number
  monthlyExpense: number
  netSavings: number
  savingsRate: number
  healthScore: number
  healthLabel: string
  safeDailySpend: number
  topCategories: { category: string; amount: number; share: number }[]
  debtTotal: number
}

export function MonthlyRecapModal({ data }: { data: MonthlyRecapData }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const topCatsText = data.topCategories.length
    ? data.topCategories
        .slice(0, 3)
        .map((c, i) => `${i + 1}. ${c.category}: ${formatIDR(c.amount)} (${Math.round(c.share * 100)}%)`)
        .join('\n')
    : 'Belum ada pengeluaran tercatat'

  const waText = `📊 *REKAP KEUANGAN KASDESK*
📅 *Periode:* ${data.monthName}
👤 *Pengguna:* ${data.userName}

💰 *Pemasukan:* ${formatIDR(data.monthlyIncome)}
💸 *Pengeluaran:* ${formatIDR(data.monthlyExpense)}
📈 *Sisa / Tabungan:* ${formatIDR(data.netSavings)} (Savings Rate: ${data.savingsRate}%)

🏆 *Financial Health:* ${data.healthScore}/100 (${data.healthLabel})
🛡️ *Aman Harian:* ${formatIDR(data.safeDailySpend)}/hari

🔥 *Kategori Pengeluaran Terbesar:*
${topCatsText}

${data.debtTotal > 0 ? `⚖️ *Kewajiban Utang/Piutang:* ${formatIDR(data.debtTotal)}\n` : ''}
_Dibuat otomatis dengan KasDesk — https://kas-desk.vercel.app_`

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(waText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback if clipboard API unavailable
    }
  }

  function onShareWhatsApp() {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function onPrint() {
    window.print()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-accent transition hover:bg-accent/20 active:scale-95 shadow-sm"
      >
        <Share2 className="h-4 w-4" aria-hidden /> Bagikan Rekap / Export
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Rekap Keuangan Bulanan"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-border-outer bg-surface p-6 shadow-2xl transition-all my-8"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-inner pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/15 text-accent">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Rekap Bulanan KasDesk</h2>
                  <p className="text-xs text-text-secondary">{data.monthName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable & Shareable Visual Statement Card */}
            <div id="recap-printable" className="my-5 rounded-2xl border border-border-outer bg-canvas/90 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-inner pb-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">KasDesk Financial Statement</span>
                  <h3 className="text-lg font-bold text-text-primary">{data.userName}</h3>
                </div>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  {data.monthName}
                </span>
              </div>

              {/* Metrics Summary Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-[11px] text-text-secondary">Pemasukan</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-accent-income">
                    {formatIDR(data.monthlyIncome)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-[11px] text-text-secondary">Pengeluaran</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-accent-expense">
                    {formatIDR(data.monthlyExpense)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-[11px] text-text-secondary">Sisa / Tabungan</p>
                  <p className={`mt-1 font-mono text-sm font-semibold ${data.netSavings >= 0 ? 'text-accent-income' : 'text-accent-expense'}`}>
                    {formatIDR(data.netSavings)}
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-[11px] text-text-secondary">Savings Rate</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-accent">
                    {data.savingsRate}%
                  </p>
                </div>
              </div>

              {/* Health Score and Safe Daily Spend */}
              <div className="flex items-center justify-between rounded-xl bg-accent/10 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span><strong>Health Score:</strong> {data.healthScore}/100 ({data.healthLabel})</span>
                </div>
                <span className="font-mono text-text-secondary">Aman: {formatIDR(data.safeDailySpend)}/hr</span>
              </div>

              {/* Top Categories Breakdown */}
              {data.topCategories.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary mb-2">Pengeluaran Terbesar:</p>
                  <div className="space-y-1.5">
                    {data.topCategories.slice(0, 3).map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between text-xs">
                        <span className="text-text-primary">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-text-secondary">{formatIDR(cat.amount)}</span>
                          <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-text-secondary">
                            {Math.round(cat.share * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={onCopy}
                className="flex items-center justify-center gap-2 rounded-xl border border-border-outer bg-surface py-2.5 px-3 text-xs font-medium text-text-primary hover:border-accent/40 active:scale-95 transition"
              >
                {copied ? <Check className="h-4 w-4 text-accent-income" /> : <Copy className="h-4 w-4 text-text-secondary" />}
                {copied ? 'Tersalin!' : 'Salin Teks WA'}
              </button>

              <button
                type="button"
                onClick={onShareWhatsApp}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 px-3 text-xs font-semibold text-white hover:opacity-90 active:scale-95 transition shadow-sm"
              >
                <Share2 className="h-4 w-4" />
                Kirim WhatsApp
              </button>

              <button
                type="button"
                onClick={onPrint}
                className="flex items-center justify-center gap-2 rounded-xl border border-border-outer bg-surface py-2.5 px-3 text-xs font-medium text-text-primary hover:border-accent/40 active:scale-95 transition"
              >
                <Printer className="h-4 w-4 text-text-secondary" />
                Cetak / PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
