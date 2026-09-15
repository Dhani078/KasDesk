import Link from 'next/link'
import { CalendarClock, Lightbulb, Target, Wallet } from 'lucide-react'
import { PrivacyAmount } from '@/components/PrivacyAmount'

type FocusInput = {
  walletCount: number
  safeDailySpend: number
  healthScore: number
  healthLabel: string
  monthlyIncome: number
  monthlyExpense: number
  vaultAllocations: number
  upcomingDebts: number
}

function pickFocus(dash: FocusInput) {
  if (dash.walletCount === 0) return { href: '/wallets', label: 'Buat dompet', title: 'Mulai dari dompet pertama', body: 'Tambahkan cash, bank, atau e-wallet agar semua fitur aktif.', Icon: Wallet }
  if (dash.monthlyIncome === 0) return { href: '/transactions', label: 'Catat pemasukan', title: 'Catat pemasukan utama', body: 'Aman Harian jadi lebih akurat kalau pemasukan bulan ini tercatat.', Icon: CalendarClock }
  if (dash.monthlyExpense > dash.monthlyIncome) return { href: '/insights', label: 'Cek laporan', title: 'Pengeluaran perlu direm', body: 'Bulan ini pengeluaran melewati pemasukan. Lihat kategori terbesar dulu.', Icon: Lightbulb }
  if (dash.vaultAllocations === 0) return { href: '/vaults', label: 'Buat target', title: 'Sisihkan uang sebelum terpakai', body: 'Buat target tabungan agar saldo tidak tercampur uang belanja.', Icon: Target }
  if (dash.upcomingDebts > 0) return { href: '/debts', label: 'Review utang', title: 'Pantau kewajiban aktif', body: 'Cek utang/piutang berjalan agar tidak mengganggu cashflow.', Icon: CalendarClock }
  return { href: '/insights', label: 'Buka laporan', title: 'Pertahankan ritme sehat', body: 'Keuanganmu mulai rapi. Review mingguan cukup untuk menjaga arah.', Icon: Lightbulb }
}

export function DailyFocus({ dash }: { dash: FocusInput }) {
  const focus = pickFocus(dash)
  const Icon = focus.Icon
  return (
    <section className="surface-card mb-6 overflow-hidden rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/15"><Icon className="h-5 w-5" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Fokus hari ini</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-text-primary">{focus.title}</h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{focus.body}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link href={focus.href} className="primary-button min-h-10 px-3 py-2 text-xs">{focus.label}</Link>
            <span className="status-pill">Aman Harian <PrivacyAmount value={dash.safeDailySpend} /></span>
            <span className="status-pill">{dash.healthLabel} {dash.healthScore}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
