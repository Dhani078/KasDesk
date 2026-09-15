'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { BarChart3, Home, Landmark, Plus, Wallet } from 'lucide-react'
import { getWallets } from '@/lib/actions'

const QuickLogSheet = dynamic(
  () => import('@/components/QuickLogSheet').then((m) => m.QuickLogSheet),
  { ssr: false }
)

type WalletLite = { id: string; name: string; balance: number }

const LEFT_LINKS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/wallets', label: 'Dompet', Icon: Wallet },
]

const RIGHT_LINKS = [
  { href: '/debts', label: 'Utang', Icon: Landmark },
  { href: '/insights', label: 'Laporan', Icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()
  const [quickLogOpen, setQuickLogOpen] = useState(false)
  const [wallets, setWallets] = useState<WalletLite[]>([])

  useEffect(() => {
    getWallets().then((w) => setWallets(w ?? [])).catch(() => {})
    const onOpen = () => setQuickLogOpen(true)
    const onSync = (e: Event) => {
      const custom = e as CustomEvent<WalletLite[]>
      if (custom.detail?.length) setWallets(custom.detail)
    }
    window.addEventListener('kasdesk:open-quicklog', onOpen)
    window.addEventListener('kasdesk:sync-wallets', onSync)
    return () => {
      window.removeEventListener('kasdesk:open-quicklog', onOpen)
      window.removeEventListener('kasdesk:sync-wallets', onSync)
    }
  }, [])

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-outer bg-surface/90 pb-safe shadow-[0_-12px_40px_rgba(0,0,0,.16)] backdrop-blur-xl"
      >
        <ul className="mx-auto flex max-w-xl items-center px-1 sm:px-3 pt-1">
          {LEFT_LINKS.map(({ href, label, Icon }) => {
            const active = href === '/'
              ? pathname === '/' || pathname.startsWith('/transactions')
              : pathname.startsWith(href)
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  prefetch={true}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-xs font-medium transition-all active:scale-95 active:opacity-75 ${
                    active
                      ? 'bg-accent/12 text-accent shadow-[inset_0_0_0_1px_rgba(79,127,232,.12)]'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            )
          })}

          {/* ShopeePay-style Center Action Button */}
          <li className="min-w-0 flex-1 flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setQuickLogOpen(true)}
              aria-label="Catat transaksi"
              className="group relative -top-3.5 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-accent-solid text-white shadow-[0_8px_22px_rgba(79,127,232,0.4)] ring-[3.5px] ring-surface transition-all duration-200 hover:scale-105 active:scale-90 hover:brightness-110"
            >
              <Plus className="h-6 w-6 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" aria-hidden />
            </button>
            <span className="-mt-2.5 text-[11px] font-medium text-text-secondary">Catat</span>
          </li>

          {RIGHT_LINKS.map(({ href, label, Icon }) => {
            const active = href === '/insights'
              ? pathname.startsWith('/insights') || pathname.startsWith('/planning')
              : pathname.startsWith(href)
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  prefetch={true}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-xs font-medium transition-all active:scale-95 active:opacity-75 ${
                    active
                      ? 'bg-accent/12 text-accent shadow-[inset_0_0_0_1px_rgba(79,127,232,.12)]'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Global QuickLogSheet (Accessible from anywhere in the app) */}
      {quickLogOpen && (
        <QuickLogSheet
          wallets={wallets}
          isOpen={quickLogOpen}
          onClose={() => setQuickLogOpen(false)}
        />
      )}
    </>
  )
}
