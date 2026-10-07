'use client'

import { useState, useEffect } from 'react'
import { Command, X } from 'lucide-react'
import { AppLock } from './AppLock'
import { BottomNav } from './BottomNav'
import { OfflineIndicator } from './OfflineIndicator'
import { PendingTxProvider } from './pending-tx'
import { FloatingCoachBubble } from '@/components/coach/FloatingCoachBubble'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when holding modifier keys except Shift for '?'
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (isInput) return

      // Escape closes shortcuts modal
      if (e.key === 'Escape' && shortcutsOpen) {
        setShortcutsOpen(false)
        return
      }

      // '?' opens shortcuts modal
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen((prev) => !prev)
        return
      }

      // Don't trigger 'c' or 'p' if a dialog is already open
      if (document.querySelector('[role="dialog"]')) return

      // 'c' or 'C' triggers QuickLog
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('kasdesk:open-quicklog'))
        return
      }

      // 'p' or 'P' toggles privacy mode
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        const isHidden = document.documentElement.classList.toggle('privacy-mode')
        try {
          localStorage.setItem('kasdesk:privacy', isHidden ? 'hidden' : 'shown')
        } catch {}
        window.dispatchEvent(new CustomEvent('kasdesk:privacy-changed'))
      }
    }

    // PWA App Shortcuts action listener (?action=quicklog, ?action=scan)
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const action = urlParams.get('action')
      if (action === 'quicklog') {
        setTimeout(() => window.dispatchEvent(new CustomEvent('kasdesk:open-quicklog')), 100)
      } else if (action === 'scan') {
        setTimeout(() => window.dispatchEvent(new CustomEvent('kasdesk:scan-file')), 100)
      }
    } catch {}

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcutsOpen])

  return (
    <AppLock>
      <PendingTxProvider>
        {children}
        <OfflineIndicator />
        <BottomNav />
        <FloatingCoachBubble />

        {shortcutsOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShortcutsOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Pintasan keyboard"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-border-outer bg-surface p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border-inner pb-3">
                <div className="flex items-center gap-2">
                  <Command className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-semibold text-text-primary">Pintasan Keyboard</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShortcutsOpen(false)}
                  aria-label="Tutup pintasan keyboard"
                  className="rounded-lg p-1 text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border-inner/50">
                  <span className="text-text-secondary">Catat transaksi baru</span>
                  <kbd className="rounded border border-border-inner bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-text-primary font-semibold">C</kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border-inner/50">
                  <span className="text-text-secondary">Fokus pencarian transaksi</span>
                  <kbd className="rounded border border-border-inner bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-text-primary font-semibold">/</kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border-inner/50">
                  <span className="text-text-secondary">Sensor nominal (Mode Privasi)</span>
                  <kbd className="rounded border border-border-inner bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-text-primary font-semibold">P</kbd>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border-inner/50">
                  <span className="text-text-secondary">Tutup jendela modal aktif</span>
                  <kbd className="rounded border border-border-inner bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-text-primary font-semibold">Esc</kbd>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-text-secondary">Buka / tutup panduan ini</span>
                  <kbd className="rounded border border-border-inner bg-white/[0.05] px-2 py-0.5 font-mono text-[11px] text-text-primary font-semibold">?</kbd>
                </div>
              </div>
            </div>
          </div>
        )}
      </PendingTxProvider>
    </AppLock>
  )
}
