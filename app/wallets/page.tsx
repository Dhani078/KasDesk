import { WalletsClient } from '@/components/WalletsClient'
import { getWallets } from '@/lib/actions'

export const dynamic = 'force-dynamic'

export default async function WalletsPage() {
  const wallets = await getWallets()
  return (
    <main className="min-h-dvh px-5 pb-32 pt-8">
      <WalletsClient
        wallets={wallets.map((w) => ({
          id: w.id,
          name: w.name,
          type: w.type,
          balance: Number(w.balance ?? 0),
        }))}
      />
    </main>
  )
}
