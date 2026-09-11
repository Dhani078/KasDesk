'use client'

import { useState, useTransition } from 'react'
import { LogOut, Loader2 } from 'lucide-react'

import { logoutAction } from '@/lib/auth/actions'
import { clearOfflineData } from '@/lib/offline/queue'

/**
 * Sign-out button.
 *
 * Two problems this solves at once:
 *
 * 1. There was NO sign-out control anywhere in the app. `logoutAction` existed
 *    but nothing called it, so a signed-in user could not end their own
 *    session from the UI — on a shared phone that is exactly the wrong default
 *    for a finance app.
 *
 * 2. The PWA service worker caches authenticated HTML (the `pages` NetworkFirst
 *    route, 24h) to satisfy the offline requirement. On a shared device the
 *    next person could be served the previous user's dashboard from cache.
 *    Clearing the caches on sign-out closes that window.
 *
 * Cache clearing is best-effort and must not block sign-out: if the browser
 * refuses (no SW, private mode), the user still gets logged out.
 */
export function LogoutButton() {
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState(false)

  async function onLogout() {
    setBusy(true)

    // Best-effort: purge cached pages BEFORE the session ends, while we still
    // have a document context that can reach the cache storage.
    try {
      await clearOfflineData()
      if (typeof caches !== 'undefined') {
        const names = await caches.keys()
        await Promise.all(names.map((n) => caches.delete(n)))
      }
    } catch {
      // Ignore — signing out matters more than clearing cache.
    }

    start(async () => {
      await logoutAction()
    })
  }

  const working = busy || pending

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={working}
      aria-label="Keluar dari akun"
      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-text-secondary ring-1 ring-border-outer transition-colors hover:text-text-primary disabled:opacity-60"
    >
      {working ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
      {working ? 'Keluar…' : 'Keluar'}
    </button>
  )
}
