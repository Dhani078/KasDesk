import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
      currency: w.currency ?? 'IDR',
      balance: Number(w.balance ?? 0),
    }))

  const archived = all
    .filter((w) => w.isArchived)
    .map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      currency: w.currency ?? 'IDR',
      balance: Number(w.balance ?? 0),
    }))

  return (
    <main className="page-shell max-w-3xl pb-32">
      <Link href="/" className="back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>
      <WalletsClient wallets={wallets} archived={archived} />
    </main>
  )
}
