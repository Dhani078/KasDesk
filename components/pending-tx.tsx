'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

/**
 * Optimistic pending transactions (FR-LOG-6, FR-LOG-11).
 *
 * QuickLogSheet calls addPending() BEFORE awaiting the server action, so the
 * row appears in the feed within ~0ms instead of after a network round-trip.
 * On success the row is replaced by the real one (server revalidation);
 * on failure the pending row rolls back and the sheet shows the error
 * (non-blocking: the user can retry).
 *
 * The provider lives in AppShell so both the feed and the sheet — rendered by
 * different subtrees — share the same state.
 */

export type PendingTx = {
  clientId: string
  walletId: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  title: string
  categoryTag: string
  createdAt: Date
  failed?: boolean
}

type PendingCtx = {
  pending: PendingTx[]
  addPending: (tx: Omit<PendingTx, 'clientId' | 'createdAt'> & { categoryTag?: string }) => string
  resolvePending: (clientId: string, ok: boolean) => void
  clearPending: (clientId: string) => void
}

const Ctx = createContext<PendingCtx | null>(null)

export function PendingTxProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingTx[]>([])

  const addPending = useCallback((tx: Omit<PendingTx, 'clientId' | 'createdAt'> & { categoryTag?: string }) => {
    const clientId = crypto.randomUUID()
    setPending((prev) => [
      {
        ...tx,
        clientId,
        categoryTag: tx.categoryTag ?? 'LAINNYA',
        createdAt: new Date(),
      },
      ...prev,
    ])
    return clientId
  }, [])

  // ok=true: the row was saved server-side; hide the optimistic row and let
  // server revalidation show the authoritative one.
  // ok=false: roll back the optimistic row (FR-LOG-11), keep it visibly
  // failed for a moment so the user sees what happened, then drop it.
  const resolvePending = useCallback((clientId: string, ok: boolean) => {
    setPending((prev) => {
      if (ok) return prev.filter((p) => p.clientId !== clientId)
      return prev.map((p) => (p.clientId === clientId ? { ...p, failed: true } : p))
    })
    if (!ok) {
      setTimeout(() => {
        setPending((prev) => prev.filter((p) => p.clientId !== clientId))
      }, 2500)
    }
  }, [])

  const clearPending = useCallback((clientId: string) => {
    setPending((prev) => prev.filter((p) => p.clientId !== clientId))
  }, [])

  return <Ctx.Provider value={{ pending, addPending, resolvePending, clearPending }}>{children}</Ctx.Provider>
}

export function usePendingTx() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePendingTx must be used inside PendingTxProvider')
  return ctx
}