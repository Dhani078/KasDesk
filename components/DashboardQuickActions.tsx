'use client'

import Link from 'next/link'
import { PlusCircle, ArrowRightLeft, Target, ArrowUpRight } from 'lucide-react'
import { hapticTap } from '@/lib/haptics'

export function DashboardQuickActions() {
  function handleOpenQuickLog(type: 'expense' | 'transfer' = 'expense') {
    hapticTap()
    window.dispatchEvent(new CustomEvent('kasdesk:open-quicklog', { detail: { type } }))
  }

  return (
    <section className="mb-6 grid grid-cols-4 gap-2" aria-label="Aksi cepat">
      <button
        type="button"
        onClick={() => handleOpenQuickLog('expense')}
        className="surface-card flex flex-col items-center justify-center rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95 cursor-pointer"
      >
        <PlusCircle className="mb-1.5 h-5 w-5 text-accent" aria-hidden />
        Catat
      </button>
      <button
        type="button"
        onClick={() => handleOpenQuickLog('transfer')}
        className="surface-card flex flex-col items-center justify-center rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95 cursor-pointer"
      >
        <ArrowRightLeft className="mb-1.5 h-5 w-5 text-accent" aria-hidden />
        Transfer
      </button>
      <Link
        href="/vaults"
        onClick={() => hapticTap()}
        className="surface-card flex flex-col items-center justify-center rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95"
      >
        <Target className="mb-1.5 h-5 w-5 text-accent" aria-hidden />
        Target
      </Link>
      <Link
        href="/insights"
        onClick={() => hapticTap()}
        className="surface-card flex flex-col items-center justify-center rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95"
      >
        <ArrowUpRight className="mb-1.5 h-5 w-5 text-accent" aria-hidden />
        Laporan
      </Link>
    </section>
  )
}
