'use client'

import { useEffect } from 'react'
import { AppLock } from './AppLock'
import { BottomNav } from './BottomNav'
import { OfflineIndicator } from './OfflineIndicator'
import { PendingTxProvider } from './pending-tx'

export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when holding modifier keys
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // 'c' or 'C' triggers QuickLog
      if (e.key === 'c' || e.key === 'C') {
        const target = e.target as HTMLElement | null
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        ) {
          return
        }
        // Don't open if a modal dialog is already open
        if (document.querySelector('[role="dialog"]')) return

        e.preventDefault()
        window.dispatchEvent(new CustomEvent('kasdesk:open-quicklog'))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <AppLock>
      <PendingTxProvider>
        {children}
        <OfflineIndicator />
        <BottomNav />
      </PendingTxProvider>
    </AppLock>
  )
}
