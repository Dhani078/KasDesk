'use client'

import Link from 'next/link'
import { BellRing, CheckCircle2, ChevronRight, Clock } from 'lucide-react'
import { executeRecurringAction } from '@/lib/planning/actions'
import { PrivacyAmount } from '@/components/PrivacyAmount'
import { formatDateShort } from '@/lib/format'
import { hapticTap, hapticSuccess } from '@/lib/haptics'
import type { RecurringRule } from '@/lib/db/schema'

type WalletLite = { id: string; name: string }

export function DueBillsCard({
  rules,
  wallets,
}: {
  rules: RecurringRule[]
  wallets: WalletLite[]
}) {
  if (!rules || rules.length === 0) return null

  return (
    <section
      aria-label="Tagihan jatuh tempo"
      className="surface-card mb-6 overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-surface p-5 sm:p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30">
            <BellRing className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Tagihan Jatuh Tempo ({rules.length})
            </h2>
            <p className="text-xs text-text-secondary">
              Pembayaran rutin yang perlu dieksekusi hari ini
            </p>
          </div>
        </div>
        <Link
          href="/planning"
          onClick={() => hapticTap()}
          className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Semua <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 divide-y divide-border-inner">
        {rules.map((rule) => {
          const isExpense = rule.type === 'expense'
          return (
            <div
              key={rule.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-text-primary truncate">
                    {rule.title}
                  </span>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                    {rule.frequency === 'weekly' ? 'Mingguan' : 'Bulanan'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <Clock className="h-3 w-3" />
                    Tempo: {formatDateShort(rule.nextRunAt)}
                  </span>
                  <span>·</span>
                  <span
                    className={`font-mono font-semibold ${
                      isExpense ? 'text-accent-expense' : 'text-accent-income'
                    }`}
                  >
                    {isExpense ? '- ' : '+ '}
                    <PrivacyAmount value={rule.amount} />
                  </span>
                </div>
              </div>

              <form action={executeRecurringAction} className="flex items-center gap-2 shrink-0">
                <input type="hidden" name="id" value={rule.id} />
                {wallets.length > 1 ? (
                  <select
                    name="walletId"
                    aria-label={`Pilih dompet untuk ${rule.title}`}
                    onChange={() => hapticTap()}
                    className="h-9 rounded-xl border border-border-outer bg-canvas px-2.5 text-xs text-text-primary outline-none focus:border-accent"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                ) : wallets.length === 1 ? (
                  <input type="hidden" name="walletId" value={wallets[0].id} />
                ) : null}
                <button
                  type="submit"
                  onClick={() => hapticSuccess()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Catat
                </button>
              </form>
            </div>
          )
        })}
      </div>
    </section>
  )
}
