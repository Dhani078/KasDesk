'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wallet, Goal, PieChart } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/wallets', label: 'Wallets', Icon: Wallet },
  { href: '/vaults', label: 'Vaults', Icon: Goal },
  { href: '/insights', label: 'Insights', Icon: PieChart },
]

/**
 * Fixed bottom navigation.
 *
 * `pb-safe` applies safe-area padding so the bar clears the home indicator
 * on notched devices (registered via @utility in globals.css).
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-outer bg-surface/90 pb-safe backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-full w-full flex-col items-center justify-center transition-colors ${
                active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span className="text-[9px] font-bold uppercase tracking-[0.05em]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
