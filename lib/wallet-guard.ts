/**
 * True when a wallet row is archived.
 *
 * Kept as its own exported function so the archived-wallet rule is unit
 * testable without a Next request scope — `createTransaction` itself calls
 * `requireUserId()`, which needs one.
 *
 * Handles both shapes of "archived" because MySQL may hand back 0/1, a
 * boolean, or (via some drivers) a Buffer for a tinyint column.
 */
export function isArchivedWallet(w: { isArchived?: unknown } | null | undefined): boolean {
  if (!w) return false
  const v = w.isArchived
  if (v === null || v === undefined) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v !== '0' && v !== ''
  if (Buffer.isBuffer(v)) return v[0] !== 0
  return Boolean(v)
}

