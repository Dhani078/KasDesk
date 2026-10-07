'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { PrivacyAmount } from '@/components/PrivacyAmount'
import { EmptyState } from '@/components/EmptyState'
import { NewDebtSheet } from '@/components/debts/NewDebtSheet'
import { SplitBillModal } from '@/components/splitbill/SplitBillModal'
import { AiDebtReminderModal } from '@/components/debts/AiDebtReminderModal'
import { DebtRow } from '@/components/debts/DebtRow'

export type DebtLite = {
  id: string
  direction: string
  personName: string
  amount: number
  paidAmount: number
  isPaid: number
  note: string | null
  dueDate: string | null
}

export function DebtsClient({ debts }: { debts: DebtLite[] }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'utang' | 'piutang'>('utang')

  const list = debts.filter((d) => d.direction === tab)
  const open_ = list.filter((d) => !d.isPaid)
  const done = list.filter((d) => d.isPaid)
  const totalOpen = open_.reduce((s, d) => s + Math.max(0, Number(d.amount) - Number(d.paidAmount || 0)), 0)
  const openReceivables = debts.filter((d) => d.direction === 'piutang' && !d.isPaid)

  return (
    <>
      <div className="mb-5 flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Utang &amp; Piutang</h1>
          <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">
            Belum lunas <PrivacyAmount value={totalOpen} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          {openReceivables.length > 0 && <AiDebtReminderModal receivables={openReceivables} />}
          <SplitBillModal />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs text-text-primary ring-1 ring-border-outer transition hover:border-accent/40 active:scale-95 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Catat
          </button>
        </div>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-surface p-1">
        {(['utang', 'piutang'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-accent-solid text-white' : 'text-text-secondary'
            }`}
          >
            {t === 'utang' ? 'Utang saya' : 'Piutang saya'}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={tab === 'utang' ? 'Tidak ada utang' : 'Tidak ada piutang'}
          body="Catat utang atau piutang untuk melacak kewajiban dan tagihan."
        />
      ) : (
        <div className="space-y-5">
          {open_.length > 0 && (
            <Section title="Belum lunas">
              {open_.map((d) => (
                <DebtRow key={d.id} debt={d} />
              ))}
            </Section>
          )}
          {done.length > 0 && (
            <Section title="Lunas">
              {done.map((d) => (
                <DebtRow key={d.id} debt={d} />
              ))}
            </Section>
          )}
        </div>
      )}

      {open && <NewDebtSheet onClose={() => setOpen(false)} />}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.06em] text-text-secondary">{title}</p>
      <div className="divide-y divide-border-inner overflow-hidden rounded-2xl border border-border-outer bg-surface">
        {children}
      </div>
    </div>
  )
}
