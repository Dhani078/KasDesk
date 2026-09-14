export type VaultProjection = {
  remaining: number
  daysLeft: number | null
  requiredDaily: number | null
  requiredWeekly: number | null
  status: 'completed' | 'on_track' | 'needs_plan'
}

export function projectVault(targetAmount: number, currentAmount: number, targetDate: string | Date | null): VaultProjection {
  const remaining = Math.max(0, Math.round(Number(targetAmount || 0) - Number(currentAmount || 0)))
  if (remaining <= 0) return { remaining: 0, daysLeft: 0, requiredDaily: 0, requiredWeekly: 0, status: 'completed' }
  if (!targetDate) return { remaining, daysLeft: null, requiredDaily: null, requiredWeekly: null, status: 'needs_plan' }
  const now = new Date()
  const end = new Date(targetDate)
  const ms = end.getTime() - now.getTime()
  const daysLeft = Math.max(1, Math.ceil(ms / 86_400_000))
  const requiredDaily = Math.ceil(remaining / daysLeft)
  const requiredWeekly = Math.ceil(remaining / Math.max(1, daysLeft / 7))
  return { remaining, daysLeft, requiredDaily, requiredWeekly, status: daysLeft >= 7 ? 'on_track' : 'needs_plan' }
}
