/**
 * Drain the offline queue into the server (FR-OFF-3).
 *
 * Client-only module: it imports the server action `createTransaction` (the
 * same one the form uses) and is consumed exclusively by client components.
 * The 'use client' boundary is what makes the import graph bundle correctly —
 * without it Next tries to resolve this module for the server too.
 *
 * Ordering: strictly oldest-first (createdAt). One op is committed and
 * removed before the next is attempted, so a mid-run failure leaves a partial
 * queue rather than a skipped one.
 *
 * Failure handling: an op that the server REFUSES (validation error,
 * insufficient balance, ...) is dropped from the queue and reported — replaying
 * it forever would wedge the queue. An op that fails because the network
 * died is left queued; the caller decides whether to retry.
 *
 * ponytail: no FR-OFF-5 conflict resolution yet — server-side action does
 * not dedupe, so a sync interrupted after commit can double-create.
 * Add a client-generated `clientId` column + unique index when FR-OFF-5
 * is built.
 */
'use client'

import { createTransaction } from '@/lib/actions'
import { listOps, removeOp, type QueuedOp } from './queue'

export type SyncResult =
  | { state: 'empty' }
  | { state: 'synced'; count: number }
  | { state: 'partial'; synced: number; remaining: number; failed: string[] }
  | { state: 'offline' }

export async function syncOfflineQueue(onProgress?: (done: number, total: number) => void): Promise<SyncResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { state: 'offline' }
  }

  const ops = (await listOps()).sort((a, b) => a.createdAt - b.createdAt)
  if (ops.length === 0) return { state: 'empty' }

  let synced = 0
  const failed: string[] = []

  for (const op of ops) {
    const total = ops.length
    onProgress?.(synced, total)

    try {
      const res = await replayOp(op)
      if (res.ok) {
        await removeOp(op.id)
        synced += 1
      } else if (res.terminal) {
        // Server refused the op — do not wedge the queue on a bad payload.
        await removeOp(op.id)
        failed.push(op.id)
      } else {
        // Transient (network dropped mid-call): stop, keep the queue intact,
        // let the next reconnect attempt continue.
        break
      }
    } catch {
      // Unexpected throw — treat as transient, stop draining.
      break
    }
  }

  const remaining = ((await listOps()) ?? []).length
  if (remaining > 0) {
    return { state: 'partial', synced, remaining, failed }
  }
  return { state: 'synced', count: synced }
}

/**
 * Replay one queued op. Returns { ok } when committed, { terminal } when the
 * server answered with a definitive refusal, { } otherwise (transient).
 */
async function replayOp(op: QueuedOp): Promise<{ ok: boolean; terminal: boolean }> {
  const res = await createTransaction(op.payload as Parameters<typeof createTransaction>[0])
  if (res.success) return { ok: true, terminal: false }
  const code = res.error?.code
  if (code === 'VALIDATION_ERROR' || code === 'NOT_FOUND' || code === 'INSUFFICIENT_BALANCE' || code === 'WALLET_ARCHIVED' || code === 'SAME_WALLET') {
    return { ok: false, terminal: true }
  }
  // UNAUTHENTICATED and UNKNOWN are transient from the queue's perspective.
  return { ok: false, terminal: false }
}