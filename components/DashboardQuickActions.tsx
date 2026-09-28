'use client'

import Link from 'next/link'
import { PlusCircle, Target, ArrowUpRight, Clock } from 'lucide-react'

export function DashboardQuickActions() {
  function handleOpenQuickLog() {
    window.dispatchEvent(new CustomEvent('kasdesk:open-quicklog'))
  }

  return (
    <section className="mb-6 grid grid-cols-4 gap-2" aria-label="Aksi cepat">
      <button
        type="button"
        onClick={handleOpenQuickLog}
        className="surface-card flex flex-col items-center justify-center rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95"
      >
        <PlusCircle className="mb-1.5 h-5 w-5 text-accent" aria-hidden />
        Catat
      </button>
      <Link
        href="/transactions"
        className="surface-card flex flex-col items-center justify-center rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95"
      >
        <Clock className="mb-1.5 h-5 w-5 text-accent" aria-hidden />
        Riwayat
      </Link>
      <Link
        href="/vaults"
        className="surface-card flex flex-col items-center justify-center rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95"
      >
        <Target className="mb-1.5 h-5 w-5 text-accent" aria-hidden />
        Target
      </Link>
      <Link
        href="/insights"
        className="surface-card flex flex-col items-center justify-center rounded-2xl p-3 text-center text-xs font-semibold text-text-primary transition hover:border-accent/35 active:scale-95"
      >
        <ArrowUpRight className="mb-1.5 h-5 w-5 text-accent" aria-hidden />
        Laporan
      </Link>
    </section>
  )
}
