/**
 * Currency + date formatting for KASDESK (id-ID).
 *
 * Money is stored as whole-rupiah integers (BIGINT). Never divide by 100 —
 * IDR has no minor unit in this model.
 */

const idr = new Intl.NumberFormat('id-ID', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const idrSigned = new Intl.NumberFormat('id-ID', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
})

/** 14250000 -> "14.250.000" (no symbol; pair with a Currency prefix). */
export function formatAmount(value: number): string {
  return idr.format(Math.round(value))
}

/** 14250000 -> "Rp 14.250.000"; -50000 -> "−Rp 50.000". */
export function formatIDR(value: number): string {
  const n = Math.round(value)
  // Put the sign BEFORE the currency symbol. `Rp ${...}` on a negative
  // produced "Rp -50.000", which reads as if "-50.000" were the amount.
  return n < 0 ? `−Rp ${idr.format(Math.abs(n))}` : `Rp ${idr.format(n)}`
}

/** For transaction rows: "+Rp 50.000" / "−Rp 35.000". */
export function formatSigned(value: number): string {
  const s = idrSigned.format(Math.round(value))
  return s.replace('-', '−') // true minus sign, per design system
}

/** Compact form for hero metrics: 14250000 -> "14,25 jt" (id-ID short scale). */
export function formatCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2).replace('.', ',')} M`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace('.', ',')} jt`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1).replace('.', ',')} rb`
  return formatAmount(value)
}

const dayFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' })

export function formatDate(d: Date | string): string {
  return dayFmt.format(new Date(d))
}
export function formatDateShort(d: Date | string): string {
  return shortFmt.format(new Date(d))
}
export function formatTime(d: Date | string): string {
  return timeFmt.format(new Date(d))
}

/** "Hari ini" / "Kemarin" / "12 September" — used for date group headers. */
export function formatDayGroup(d: Date | string): string {
  const date = new Date(d)
  const today = new Date()
  const yest = new Date(today)
  yest.setDate(yest.getDate() - 1)

  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(date, today)) return 'Hari ini'
  if (same(date, yest)) return 'Kemarin'
  return dayFmt.format(date)
}

export function toDateKey(d: Date | string): string {
  return new Date(d).toDateString()
}

/** Days remaining in the current calendar month (min 1). */
export function daysLeftInMonth(now = new Date()): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Math.max(1, last - now.getDate() + 1)
}
