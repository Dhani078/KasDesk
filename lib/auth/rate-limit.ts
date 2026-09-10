/**
 * In-memory rate limiter for authentication attempts.
 *
 * Threat T-01 in SECURITY-SPEC is credential stuffing / brute force. MySQL
 * has no RLS and TiDB provides no login throttling, so without this the
 * login endpoint can be hammered indefinitely.
 *
 * Scope: per-process, fixed window. That is the right trade-off here —
 * a multi-instance deployment would put a shared store (Redis/Upstash)
 * behind the same interface. It is deliberately NOT used to enforce
 * anything security-critical beyond slowing down guessing: it resets on
 * deploy, which an attacker cannot trigger.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Max attempts allowed within the window. */
const LIMIT = 8
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

/** Prevent unbounded growth from attackers using random keys. */
const MAX_KEYS = 10_000

function sweep(now: number) {
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k)
  }
}

/**
 * Enforce the memory cap. Called on EVERY miss, not probabilistically —
 * a probabilistic cap can be outrun by a flood, which is exactly what it
 * exists to stop (a test inserting 12.000 keys ended with 10.100).
 */
function enforceCap(now: number) {
  if (buckets.size >= MAX_KEYS) {
    // Drop expired entries first, then evict whichever entries expire
    // soonest — they are the ones holding memory longest.
    sweep(now)

    if (buckets.size >= MAX_KEYS) {
      const entries = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
      const excess = buckets.size - (MAX_KEYS - 1)
      for (let i = 0; i < excess; i++) buckets.delete(entries[i][0])
    }
  }
}

/**
 * Rate limit for a caller-defined budget.
 *
 * The default `checkRateLimit` is locked to the shared LOGIN constants on
 * purpose — auth throttling should not be tunable per call site. OCR needs
 * a different budget (more expensive, fewer calls), so it gets its own
 * explicit function rather than a knob on the auth path.
 */
export function checkRateLimitWith(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const k = `custom:${key}`

  if (buckets.size > 0 && Math.random() < 0.01) sweep(now)
  enforceCap(now)

  const b = buckets.get(k)
  if (!b || b.resetAt <= now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count += 1
  return { ok: true }
}

/** Record an attempt and report whether it is allowed.
 * @returns `{ ok: true }` or `{ ok: false, retryAfterSec }`.
 */
export function checkRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()

  // Expired-entry cleanup stays cheap and probabilistic — it is only an
  // optimisation, never relied on for correctness or safety.
  if (buckets.size > 0 && Math.random() < 0.01) sweep(now)

  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    // Every insertion goes through the cap, so a flood cannot outrun it.
    enforceCap(now)
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }

  if (b.count >= LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }

  b.count += 1
  return { ok: true }
}

/** Clear the bucket for a key — call after a SUCCESSFUL login. */
export function clearRateLimit(key: string): void {
  buckets.delete(key)
}

/** Visible for tests. */
export function _bucketSize(): number {
  return buckets.size
}
