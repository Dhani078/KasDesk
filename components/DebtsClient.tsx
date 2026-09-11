'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2, Check, Wallet } from 'lucide-react'

import { createDebt, settleDebt, deleteDebt } from '@/lib/actions'
import { formatIDR, formatDate } from '@/lib/format'
import { EmptyState } from '@/components/EmptyState'

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
  const totalOpen = open_.reduce((s, d) => s + Number(d.amount), 0)

  return (
    <>
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Utang &amp; Piutang</h1>
          <p className="mt-1 font-mono text-sm tabular-nums text-text-secondary">
            Belum lunas {formatIDR(totalOpen)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2 text-xs text-text-primary ring-1 ring-border-outer"
        >
          <Plus className="h-3.5 w-3.5" /> Catat
        </button>
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
      <p className="mb-2 text-[11px] uppercase tracking-[0.06em] text-text-secondary">{title}</p>
      <div className="divide-y divide-border-inner overflow-hidden rounded-2xl border border-border-outer bg-surface">
        {children}
      </div>
    </div>
  )
}

function DebtRow({ debt }: { debt: DebtLite }) {
  const [pending, start] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [payOpen, setPayOpen] = useState(false)
    const [payAmount, setPayAmount] = useState('')

    function onSettle(amount?: number) {
      start(async () => {
        const r = await settleDebt(debt.id, amount)
        if (!r.success) setError(r.error.message)
        setPayOpen(false)
      })
    }
  function onDelete() {
    start(async () => {
      const r = await deleteDebt(debt.id)
      if (!r.success) setError(r.error.message)
    })
  }

  const overdue =
    debt.dueDate && !debt.isPaid && new Date(debt.dueDate) < new Date()

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${debt.isPaid ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
          {debt.personName}
        </p>
        <p className="text-[11px] text-text-secondary">
          {debt.note ? `${debt.note} · ` : ''}
          {debt.dueDate ? (
            <span className={overdue ? 'text-danger' : ''}>
              {overdue ? 'Jatuh tempo: ' : 'Tempo '}
              {formatDate(debt.dueDate)}
            </span>
          ) : (
            'Tanpa tempo'
          )}
        </p>
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </div>
      <span className="font-mono text-sm tabular-nums text-text-primary">
        {formatIDR(debt.amount)}
      </span>
      {!debt.isPaid && (
              <>
              <button
                type="button"
                onClick={() => onSettle()}
                disabled={pending}
                aria-label={`Tandai lunas ${debt.personName}`}
                className="rounded-lg p-1.5 text-text-secondary ring-1 ring-border-outer disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
        <button
          type="button"
          onClick={() => setPayOpen(true)}
          disabled={pending}
          aria-label={`Bayar sebagian ${debt.personName}`}
          className="rounded-lg p-1.5 text-text-secondary ring-1 ring-border-outer disabled:opacity-50"
        >
          <Wallet className="h-3.5 w-3.5" />
        </button>
        </>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label={`Hapus ${debt.personName}`}
        className="rounded-lg p-1.5 text-text-secondary ring-1 ring-border-outer disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {payOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPayOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bayar sebagian"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Bayar Sebagian</h2>
              <button type="button" onClick={() => setPayOpen(false)} aria-label="Tutup" className="text-text-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-text-secondary">
              {debt.personName} · sisa {formatIDR(Math.max(0, Number(debt.amount) - Number(debt.paidAmount)))}
            </p>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              placeholder="Jumlah yang dibayar"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value.replace(/[^\d]/g, ''))}
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
            />
            {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="flex-1 rounded-xl px-4 py-3 text-sm text-text-secondary ring-1 ring-border-outer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => onSettle(Number(payAmount || '0'))}
                disabled={pending || !payAmount}
                className="flex-1 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NewDebtSheet({ onClose }: { onClose: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const due = String(fd.get('due_date') ?? '').trim()
    const r = await createDebt({
      direction: String(fd.get('direction') ?? 'utang') as 'utang' | 'piutang',
      person_name: String(fd.get('person_name') ?? ''),
      amount: Number(String(fd.get('amount') ?? '0').replace(/[^\d]/g, '')),
      note: String(fd.get('note') ?? '').trim() || undefined,
      due_date: due ? new Date(due).toISOString() : undefined,
    })
    setPending(false)
    if (!r.success) { setError(r.error.message); return }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat utang"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Catat Utang / Piutang</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="d-dir" className="mb-1 block text-xs text-text-secondary">Jenis</label>
            <select
              id="d-dir" name="direction" defaultValue="utang"
              className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
            >
              <option value="utang">Utang saya (saya berhutang)</option>
              <option value="piutang">Piutang saya (orang berhutang)</option>
            </select>
          </div>
          <div>
            <label htmlFor="d-person" className="mb-1 block text-xs text-text-secondary">Nama orang</label>
            <input
              id="d-person" name="person_name" required maxLength={80} placeholder="Budi"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="d-amount" className="mb-1 block text-xs text-text-secondary">Jumlah (Rp)</label>
            <input
              id="d-amount" name="amount" inputMode="numeric" required placeholder="50000"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="d-due" className="mb-1 block text-xs text-text-secondary">
              Jatuh tempo (opsional)
            </label>
            <input
              id="d-due" name="due_date" type="date"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="d-note" className="mb-1 block text-xs text-text-secondary">Catatan (opsional)</label>
            <input
              id="d-note" name="note" maxLength={500} placeholder="Bayar makan siang"
              className="w-full rounded-xl border border-border bg-canvas px-4 py-3 text-text-primary outline-none focus:border-accent"
            />
          </div>

          {error && <p role="alert" className="text-xs text-danger">{error}</p>}

          <button
            type="submit" disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </form>
      </div>
    </div>
  )
}
