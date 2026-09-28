import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DebtsClient } from '@/components/DebtsClient'
import { getDebts } from '@/lib/actions'

export const dynamic = 'force-dynamic'

export default async function DebtsPage() {
  const debts = await getDebts()
  return (
    <main className="page-shell max-w-3xl pb-32">
      <Link href="/settings" className="back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Akun &amp; Pengaturan
      </Link>
      <DebtsClient
        debts={debts.map((d) => ({
          id: d.id,
          direction: d.direction,
          personName: d.personName,
          amount: Number(d.amount ?? 0),
          paidAmount: Number(d.paidAmount ?? 0),
          isPaid: Number(d.isPaid ?? 0),
          note: d.note ?? null,
          dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
        }))}
      />
    </main>
  )
}
