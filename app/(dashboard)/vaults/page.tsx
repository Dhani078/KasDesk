import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { VaultsClient } from '@/components/VaultsClient'
import { getVaults, getWallets } from '@/lib/actions'
import { getDashboardSummary } from '@/lib/analytics/actions'

export const dynamic = 'force-dynamic'

export default async function VaultsPage() {
  const [vaults, wallets, dash] = await Promise.all([
    getVaults(),
    getWallets(),
    getDashboardSummary(),
  ])

  return (
    <main className="page-shell max-w-3xl pb-32">
      <Link href="/settings" className="back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Akun &amp; Pengaturan
      </Link>
      <VaultsClient
        vaults={vaults}
        wallets={wallets}
        monthlyIncome={dash.monthlyIncome}
        monthlyExpense={dash.monthlyExpense}
      />
    </main>
  )
}
