/**
 * Offline transaction queue (IndexedDB, no wrapper lib).
 *
 * FR-OFF-2/6: when the device is offline, mutations (currently: transaction
 * creation) are stored here instead of failing silently, and drained when the
 * connection returns (FR-OFF-3).
 *
 * Deliberately narrow: one object store, one shape of op. If a second
 * mutation type appears later, extend the `kind` field — the drain logic in
 * lib/offline/sync.ts switches on it.
 *
 * Replay safety: every queued transaction carries a client mutation UUID and
 * the database enforces a per-user unique index, so reconnect retries are idempotent.
 */

export type QueuedOp = {
  id: string
  kind: 'create-transaction'
  payload: Record<string, unknown>
  createdAt: number
}

const DB_NAME = 'kasdesk-offline'
const DB_VERSION = 1
const STORE = 'ops'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function enqueueOp(op: Omit<QueuedOp, 'id' | 'createdAt'>): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ ...op, id: crypto.randomUUID(), createdAt: Date.now() } satisfies QueuedOp)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export async function listOps(): Promise<QueuedOp[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => { db.close(); resolve(req.result as QueuedOp[]) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

export async function removeOp(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

export function clearOfflineData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}
