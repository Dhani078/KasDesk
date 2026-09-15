'use client'

import { Calendar, Sparkles } from 'lucide-react'

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getYesterdayDateString(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return getLocalDateString(d)
}

export function DateTransactionPicker({
  dateText,
  setDateText,
  isReceiptDate,
}: {
  dateText: string
  setDateText: (d: string) => void
  isReceiptDate?: boolean
}) {
  const todayStr = getLocalDateString()
  const yesterdayStr = getYesterdayDateString()

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor="occurred_date" className="text-xs text-text-secondary">
          Tanggal Transaksi
        </label>
        {isReceiptDate && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-accent">
            <Sparkles className="h-3 w-3" /> Sesuai struk
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="date"
            id="occurred_date"
            name="occurred_date"
            value={dateText}
            onChange={(e) => setDateText(e.target.value)}
            className="w-full rounded-xl border border-border bg-canvas py-2.5 pl-9 pr-3 font-mono text-sm text-text-primary outline-none focus:border-accent"
          />
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setDateText(todayStr)}
            className={`rounded-xl px-2.5 py-2 text-xs font-medium transition active:scale-95 ${
              dateText === todayStr
                ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                : 'border border-border-outer bg-white/[0.03] text-text-secondary hover:text-text-primary'
            }`}
          >
            Hari ini
          </button>
          <button
            type="button"
            onClick={() => setDateText(yesterdayStr)}
            className={`rounded-xl px-2.5 py-2 text-xs font-medium transition active:scale-95 ${
              dateText === yesterdayStr
                ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                : 'border border-border-outer bg-white/[0.03] text-text-secondary hover:text-text-primary'
            }`}
          >
            Kemarin
          </button>
        </div>
      </div>
    </div>
  )
}
