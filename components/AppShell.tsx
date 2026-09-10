'use client'

import { usePathname } from 'next/navigation'
import { BottomNav } from './BottomNav'

const AUTH_ROUTES = ['/login', '/register']

/**
 * Renders the bottom navigation only on authenticated screens, so it does
 * not appear over the login/register forms.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = AUTH_ROUTES.some((r) => pathname?.startsWith(r))

  return (
    <>
      {children}
      {!hideNav && <BottomNav />}
    </>
  )
}
