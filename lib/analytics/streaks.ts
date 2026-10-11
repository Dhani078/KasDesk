const APP_TZ = process.env.APP_TIME_ZONE || 'Asia/Makassar'

/** Format a Date to 'YYYY-MM-DD' in the app timezone */
function toLocalDay(d: Date, tz = APP_TZ): string {
  return d.toLocaleDateString('en-CA', { timeZone: tz })
}

export type StreakResult = { current: number; best: number; totalDays: number }

/**
 * Compute consecutive-day streaks from an array of transaction dates.
 * Deduplicates to unique calendar days in the app timezone.
 */
export function computeStreaks(dates: Date[], now = new Date()): StreakResult {
  if (dates.length === 0) return { current: 0, best: 0, totalDays: 0 }

  const uniqueDays = [...new Set(dates.map((d) => toLocalDay(d)))]
  uniqueDays.sort() // ascending YYYY-MM-DD

  const totalDays = uniqueDays.length
  const today = toLocalDay(now)

  // Walk backwards from end to compute best streak
  let best = 1
  let run = 1
  for (let i = uniqueDays.length - 1; i > 0; i--) {
    const prev = new Date(uniqueDays[i - 1] + 'T12:00:00')
    const curr = new Date(uniqueDays[i] + 'T12:00:00')
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
    if (diffDays === 1) {
      run++
      if (run > best) best = run
    } else {
      run = 1
    }
  }

  // Current streak: count consecutive days ending at today (or yesterday)
  const lastDay = uniqueDays[uniqueDays.length - 1]
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toLocalDay(yesterday)

  if (lastDay !== today && lastDay !== yesterdayStr) {
    return { current: 0, best, totalDays }
  }

  let current = 1
  for (let i = uniqueDays.length - 2; i >= 0; i--) {
    const prev = new Date(uniqueDays[i] + 'T12:00:00')
    const curr = new Date(uniqueDays[i + 1] + 'T12:00:00')
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000)
    if (diffDays === 1) current++
    else break
  }

  return { current, best, totalDays }
}
