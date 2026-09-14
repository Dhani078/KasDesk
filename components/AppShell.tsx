'use client'

import { AppLock } from './AppLock'
import { BottomNav } from './BottomNav'
import { OfflineIndicator } from './OfflineIndicator'
import { PendingTxProvider } from './pending-tx'

export function AppShell({ children }: { children: React.ReactNode }) {
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
