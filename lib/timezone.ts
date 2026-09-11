const DEFAULT_TIME_ZONE = process.env.APP_TIME_ZONE || 'Asia/Makassar'

function partsAt(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

function localMidnightUtc(year: number, month: number, day: number, timeZone: string) {
  const guess = new Date(Date.UTC(year, month - 1, day))
  const shown = partsAt(guess, timeZone)
  const represented = Date.UTC(Number(shown.year), Number(shown.month) - 1, Number(shown.day))
  return new Date(guess.getTime() - (represented - guess.getTime()))
}

export function getMonthWindow(now = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const shown = partsAt(now, timeZone)
  const year = Number(shown.year)
  const monthNumber = Number(shown.month)
  const start = localMidnightUtc(year, monthNumber, 1, timeZone)
  const nextYear = monthNumber === 12 ? year + 1 : year
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1
  const end = localMidnightUtc(nextYear, nextMonth, 1, timeZone)
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return { month: `${year}-${String(monthNumber).padStart(2, '0')}`, start, end, daysLeft: Math.max(1, daysInMonth - Number(shown.day) + 1), timeZone }
}
