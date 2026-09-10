import { DebtsClient } from '@/components/DebtsClient'
import { getDebts } from '@/lib/actions'

export const dynamic = 'force-dynamic'

export default async function DebtsPage() {
  const debts = await getDebts()
  return (
    <main className="min-h-dvh px-5 pb-32 pt-8">
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
