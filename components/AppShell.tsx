'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from './BottomNav'
import { OfflineIndicator } from './OfflineIndicator'
import { PendingTxProvider } from './pending-tx'

const AUTH_ROUTES = ['/login', '/register']

/**
 * Renders the bottom navigation only on authenticated screens, so it does
 * not appear over the login/register forms. The offline indicator is
 * shell-wide but hidden on auth screens too — a queued transaction only
 * exists once the user is signed in.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = AUTH_ROUTES.some((r) => pathname?.startsWith(r))

  return (
    <PendingTxProvider>
      {children}
      {!hideNav && (
        <>
          <OfflineIndicator />
          <BottomNav />
        </>
      )}
    </PendingTxProvider>
  )
}