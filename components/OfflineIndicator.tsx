'use client'

import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, Check } from 'lucide-react'

import { listOps } from '@/lib/offline/queue'
import { syncOfflineQueue } from '@/lib/offline/sync'

/**
 * Offline banner + auto-sync (FR-OFF-4 indicator, FR-OFF-3 sync on reconnect).
 *
 * Rendered once in the app shell. Watches navigator.onLine and the queued-op
 * count, shows a banner while offline or while pending ops wait, and drains
 * the queue on reconnect.
 *
 * Having the queue count drive the banner matters more than the network state
 * alone: ops can sit queued even when online (a refusal earlier, or a queued
 * op from a previous offline stretch that never drained).
 */
export function OfflineIndicator() {
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [last, setLast] = useState<'ok' | 'failed' | null>(null)

  useEffect(() => {
    let live = true

    const refreshPending = () => listOps().then((ops) => live && setPending(ops.length)).catch(() => {})
    refreshPending()

    const onOnline = () => {
      setOnline(true)
      setSyncing(true)
      syncOfflineQueue()
        .then((r) => {
          if (!live) return
          setLast(r.state === 'synced' ? 'ok' : r.state === 'partial' ? 'failed' : 'ok')
          refreshPending()
        })
        .catch(() => {})
        .finally(() => live && setSyncing(false))
    }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    // Drain once on mount too — a queued op from a previous session with the
    // network already back should not wait for the next online event.
    if (navigator.onLine) onOnline()

    return () => {
      live = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (online && pending === 0 && !syncing) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-2xl border border-border-outer bg-surface px-4 py-2.5 text-xs shadow-lg">
        {syncing ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-text-secondary" aria-hidden />
            <span className="text-text-secondary">Menyinkronkan {pending} transaksi…</span>
          </>
        ) : !online ? (
          <>
            <CloudOff className="h-3.5 w-3.5 text-accent-expense" aria-hidden />
            <span className="text-text-primary">Offline — transaksi akan diantrekan</span>
          </>
        ) : last === 'ok' ? (
          <>
            <Check className="h-3.5 w-3.5 text-accent-income" aria-hidden />
            <span className="text-text-primary">Transaksi tersinkron</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5 text-text-secondary" aria-hidden />
            <span className="text-text-primary">{pending} menunggu sinkronisasi</span>
          </>
        )}
      </div>
    </div>
  )
}