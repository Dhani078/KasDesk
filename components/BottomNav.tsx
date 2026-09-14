'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Home, Landmark, Lightbulb, Target, Wallet } from 'lucide-react'

const LINKS = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/wallets', label: 'Dompet', Icon: Wallet },
  { href: '/vaults', label: 'Target', Icon: Target },
  { href: '/debts', label: 'Utang', Icon: Landmark },
  { href: '/coach', label: 'Coach', Icon: Lightbulb },
  { href: '/insights', label: 'Laporan', Icon: BarChart3 },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-border-outer bg-surface/90 pb-safe shadow-[0_-12px_40px_rgba(0,0,0,.16)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-2xl items-stretch px-1 sm:px-3">
        {LINKS.map(({ href, label, Icon }) => {
          const active = href === '/'
            ? pathname === '/' || pathname.startsWith('/transactions') || pathname.startsWith('/settings')
            : href === '/insights'
              ? pathname.startsWith('/insights') || pathname.startsWith('/planning')
              : pathname.startsWith(href)
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link href={href} prefetch={true} aria-current={active ? 'page' : undefined} className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-all active:scale-95 active:opacity-75 ${active ? 'bg-accent/12 text-accent shadow-[inset_0_0_0_1px_rgba(79,127,232,.12)]' : 'text-text-secondary hover:text-text-primary'}`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
