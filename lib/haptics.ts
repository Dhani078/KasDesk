/**
 * Tactile Haptic Vibration Engine (EPIC 8)
 *
 * Provides subtle haptic feedback patterns on mobile devices via the HTML5 Vibration API.
 * Automatically no-ops safely when running on desktop browsers or unsupported clients.
 */

export type HapticType = 'tap' | 'success' | 'warning' | 'delete'

export const HAPTIC_PATTERNS: Record<HapticType, number[]> = {
  tap: [10],
  success: [15, 40, 20],
  warning: [30, 60, 30],
  delete: [40, 80, 50],
}

/**
 * Triggers vibration pattern safely with zero exception risks.
 */
export function triggerHaptic(type: HapticType | number[]): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return false

  try {
    const pattern = Array.isArray(type) ? type : HAPTIC_PATTERNS[type] || [10]
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}

export const hapticTap = () => triggerHaptic('tap')
export const hapticSuccess = () => triggerHaptic('success')
export const hapticWarning = () => triggerHaptic('warning')
export const hapticDelete = () => triggerHaptic('delete')
