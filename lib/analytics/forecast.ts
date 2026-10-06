/**
 * Predictive Cashflow Forecast & Financial Autopilot Engine (PRD v2.0 §3.3).
 * Simulates daily cashflow curve for 30/60/90 days incorporating:
 *  1. Initial liquid balance (S_0)
 *  2. Scheduled recurring income & expenses from recurringRules
 *  3. Historical discretionary daily burn rate
 *  4. Tanggal Kritis (Critical threshold & overdraft alert)
 *  5. What-If shock simulator
 */

export interface RecurringForecastRule {
  id?: string
  title: string
  type: 'income' | 'expense' | string
  amount: number
  frequency: 'weekly' | 'monthly' | string
  nextRunAt: Date | string
  isActive?: number | boolean
}

export interface ForecastPoint {
  dayIndex: number
  date: string // YYYY-MM-DD
  balance: number
  inflow: number
  scheduledOutflow: number
  burnRate: number
  isCritical: boolean
}

export interface ForecastOptions {
  currentBalance: number
  dailyBurnRate: number
  recurringRules?: RecurringForecastRule[]
  projectionDays?: number // default 30, up to 90
  criticalThreshold?: number // default 500_000 (Rp 500k safety floor)
  oneTimeShockAmount?: number // What-if additional expense shock
  oneTimeShockDay?: number // Day index when shock occurs (default 1)
  startDate?: Date
}

export interface ForecastResult {
  initialBalance: number
  projectionDays: number
  dailyBurnRate: number
  criticalThreshold: number
  points: ForecastPoint[]
  lowestBalance: number
  lowestDate: string
  criticalDate: string | null
  daysUntilCritical: number | null
  willOverdraft: boolean
  totalScheduledIncome: number
  totalScheduledExpense: number
  suggestedDailyCut: number
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function simulateCashflowForecast(options: ForecastOptions): ForecastResult {
  const {
    currentBalance,
    dailyBurnRate = 0,
    recurringRules = [],
    projectionDays = 30,
    criticalThreshold = 500_000,
    oneTimeShockAmount = 0,
    oneTimeShockDay = 1,
    startDate = new Date(),
  } = options

  const days = Math.max(7, Math.min(90, Math.trunc(projectionDays)))
  const safeBurn = Math.max(0, Math.trunc(dailyBurnRate))
  const safeShock = Math.max(0, Math.trunc(oneTimeShockAmount))

  // Prepare normalized active rules
  const activeRules = recurringRules
    .filter((r) => r.isActive === undefined || r.isActive === 1 || r.isActive === true)
    .map((r) => {
      const runDate = new Date(r.nextRunAt)
      return {
        title: r.title,
        type: r.type,
        amount: Math.max(0, Number(r.amount || 0)),
        frequency: r.frequency,
        nextRunAt: Number.isNaN(runDate.getTime()) ? new Date() : runDate,
      }
    })

  const baseZero = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 12, 0, 0)
  const points: ForecastPoint[] = []

  let runningBalance = currentBalance
  let lowestBalance = currentBalance
  let lowestDate = toLocalDateString(baseZero)
  let criticalDate: string | null = null
  let daysUntilCritical: number | null = null
  let totalScheduledIncome = 0
  let totalScheduledExpense = 0
  let willOverdraft = currentBalance < 0

  // Point 0: Current Day (Baseline)
  points.push({
    dayIndex: 0,
    date: toLocalDateString(baseZero),
    balance: runningBalance,
    inflow: 0,
    scheduledOutflow: 0,
    burnRate: 0,
    isCritical: runningBalance <= criticalThreshold,
  })

  for (let i = 1; i <= days; i++) {
    const simDate = new Date(baseZero)
    simDate.setDate(simDate.getDate() + i)
    const dateStr = toLocalDateString(simDate)

    let dayInflow = 0
    let dayScheduledOutflow = 0

    // Evaluate recurring rules matching this day
    for (const rule of activeRules) {
      if (simDate < rule.nextRunAt) continue

      let match = false
      if (rule.frequency === 'weekly') {
        match = simDate.getDay() === rule.nextRunAt.getDay()
      } else if (rule.frequency === 'monthly') {
        const targetDay = rule.nextRunAt.getDate()
        // If month has fewer days, clamp to last day of month
        const lastDayOfMonth = new Date(simDate.getFullYear(), simDate.getMonth() + 1, 0).getDate()
        const effectiveDay = Math.min(targetDay, lastDayOfMonth)
        match = simDate.getDate() === effectiveDay
      }

      if (match) {
        if (rule.type === 'income') {
          dayInflow += rule.amount
          totalScheduledIncome += rule.amount
        } else {
          dayScheduledOutflow += rule.amount
          totalScheduledExpense += rule.amount
        }
      }
    }

    // Apply one-time shock if configured
    if (safeShock > 0 && i === oneTimeShockDay) {
      dayScheduledOutflow += safeShock
    }

    // Calculate balance mutation
    runningBalance = runningBalance + dayInflow - dayScheduledOutflow - safeBurn

    if (runningBalance < lowestBalance) {
      lowestBalance = runningBalance
      lowestDate = dateStr
    }

    if (runningBalance < 0) {
      willOverdraft = true
    }

    const isCritical = runningBalance <= criticalThreshold
    if (isCritical && criticalDate === null) {
      criticalDate = dateStr
      daysUntilCritical = i
    }

    points.push({
      dayIndex: i,
      date: dateStr,
      balance: runningBalance,
      inflow: dayInflow,
      scheduledOutflow: dayScheduledOutflow,
      burnRate: safeBurn,
      isCritical,
    })
  }

  // Calculate suggested daily cut to avoid dropping below critical threshold
  let suggestedDailyCut = 0
  if (lowestBalance < criticalThreshold && daysUntilCritical !== null && daysUntilCritical > 0) {
    const deficit = criticalThreshold - lowestBalance
    suggestedDailyCut = Math.ceil(deficit / daysUntilCritical)
  }

  return {
    initialBalance: currentBalance,
    projectionDays: days,
    dailyBurnRate: safeBurn,
    criticalThreshold,
    points,
    lowestBalance,
    lowestDate,
    criticalDate,
    daysUntilCritical,
    willOverdraft,
    totalScheduledIncome,
    totalScheduledExpense,
    suggestedDailyCut,
  }
}
