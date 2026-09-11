import { WalletsClient } from '@/components/WalletsClient'
import { getWalletsIncludingArchived } from '@/lib/actions'

export const dynamic = 'force-dynamic'

export default async function WalletsPage() {
  // Includes archived wallets: the list is the only place to restore one, and
  // getWallets() would hide them forever.
  const all = await getWalletsIncludingArchived()

  const wallets = all
    .filter((w) => !w.isArchived)
    .map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      balance: Number(w.balance ?? 0),
    }))

  const archived = all
    .filter((w) => w.isArchived)
    .map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      balance: Number(w.balance ?? 0),
    }))

  return (
    <main className="min-h-dvh px-5 pb-32 pt-8">
      <WalletsClient wallets={wallets} archived={archived} />
    </main>
  )
}
