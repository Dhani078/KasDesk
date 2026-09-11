'use client'
import {BottomNav} from './BottomNav'
import {OfflineIndicator} from './OfflineIndicator'
import {PendingTxProvider} from './pending-tx'
export function AppShell({children}:{children:React.ReactNode}){return <PendingTxProvider>{children}<OfflineIndicator/><BottomNav/></PendingTxProvider>}
