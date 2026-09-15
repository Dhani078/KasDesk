'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2, Check, Wallet, MessageCircle } from 'lucide-react'

import { settleDebt, deleteDebt } from '@/lib/actions'
import { formatIDR, formatDate } from '@/lib/format'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import { EmptyState } from '@/components/EmptyState'
import { NewDebtSheet } from '@/components/debts/NewDebtSheet'

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
            Belum lunas <PrivacyAmount value={totalOpen} />
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
      <p className="mb-2 text-xs uppercase tracking-[0.06em] text-text-secondary">{title}</p>
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

  const remaining = Number(debt.amount) - Number(debt.paidAmount || 0)
  const waMessage = `Halo ${debt.personName}, mau mengingatkan catatan pinjaman${debt.note ? ` (${debt.note})` : ''} sebesar ${formatIDR(remaining)}. Jika sudah senggang bisa ditransfer yaa. Terima kasih! 🙏`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${debt.isPaid ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
          {debt.personName}
        </p>
        <p className="text-xs text-text-secondary">
          {debt.note ? `${debt.note} · ` : ''}
          {debt.dueDate ? (
            <span className={overdue ? 'text-danger' : ''}>
              {formatDate(new Date(debt.dueDate))}
              {overdue ? ' (lewat jatuh tempo)' : ''}
            </span>
          ) : (
            'Tanpa jatuh tempo'
          )}
        </p>
        {Number(debt.paidAmount) > 0 && (
          <p className="mt-0.5 text-[11px] text-accent">
            Terbayar <PrivacyAmount value={debt.paidAmount} /> · Sisa{' '}
            <PrivacyAmount value={remaining} />
          </p>
        )}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>

      <span
        className={`font-mono text-sm tabular-nums ${
          debt.isPaid
            ? 'text-text-secondary line-through'
            : debt.direction === 'piutang'
              ? 'text-accent-income'
              : 'text-text-primary'
        }`}
      >
        <PrivacyAmount
          value={remaining}
          sign={debt.direction === 'piutang' ? '+' : '−'}
        />
      </span>

      {!debt.isPaid && (
        <>
          {debt.direction === 'piutang' && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Kirim pengingat WhatsApp"
              className="rounded-lg p-2 text-text-secondary transition hover:bg-white/[0.04] hover:text-[#25D366]"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setPayAmount(String(remaining))
              setPayOpen(true)
            }}
            disabled={pending}
            title="Bayar cicil / sebagian"
            className="rounded-lg p-2 text-text-secondary transition hover:bg-white/[0.04] hover:text-accent"
          >
            <Wallet className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSettle()}
            disabled={pending}
            title="Tandai lunas penuh"
            className="rounded-lg p-2 text-text-secondary transition hover:bg-white/[0.04] hover:text-accent-income"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
        </>
      )}

      {debt.isPaid ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          title="Hapus"
          className="rounded-lg p-2 text-text-secondary transition hover:bg-white/[0.04] hover:text-danger"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {payOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPayOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bayar utang"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-border-outer bg-surface p-5 pb-safe"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">Bayar / Cicil</h2>
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="text-text-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-xs text-text-secondary">
              {debt.personName} · sisa {formatIDR(Math.max(0, Number(debt.amount) - Number(debt.paidAmount)))}
            </p>
            <div className="mb-4">
              <label htmlFor="pay-amt" className="mb-1 block text-xs text-text-secondary">
                Jumlah bayar kali ini (Rp)
              </label>
              <input
                id="pay-amt"
                inputMode="numeric"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value.replace(/[^\d]/g, ''))}
                className="w-full rounded-xl border border-border bg-canvas px-4 py-3 font-mono tabular-nums text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div className="flex gap-2">
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
