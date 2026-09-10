'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wallet, Target, PieChart } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/wallets', label: 'Dompet', Icon: Wallet },
  { href: '/vaults', label: 'Tabungan', Icon: Target },
  { href: '/debts', label: 'Utang', Icon: PieChart },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-outer bg-surface/95 pb-safe backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                  active ? 'text-accent' : 'text-text-secondary'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
