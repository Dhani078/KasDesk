import { VaultsClient } from '@/components/VaultsClient'
import { getVaults, getWallets } from '@/lib/actions'

export const dynamic = 'force-dynamic'

export default async function VaultsPage() {
  const [vaults, wallets] = await Promise.all([getVaults(), getWallets()])

  return (
    <main className="min-h-dvh px-5 pt-8 pb-32">
      <VaultsClient vaults={vaults} wallets={wallets} />
    </main>
  )
}
