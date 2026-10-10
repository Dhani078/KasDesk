'use client'

import { Check, Copy, MessageCircle, Wallet } from 'lucide-react'
import type { SplitBillResult, MemberBillBreakdown } from '@/lib/split-bill'
import { formatIDR } from '@/lib/format'

export function SplitBillResultsSection({
  splitResult,
  savedDebtIds,
  isPendingDebt,
  copiedId,
  onCopyWA,
  onShareWA,
  onSaveAsDebt,
}: {
  splitResult: SplitBillResult
  savedDebtIds: Record<string, boolean>
  isPendingDebt: boolean
  copiedId: string | null
  onCopyWA: (mb: MemberBillBreakdown) => void
  onShareWA: (mb: MemberBillBreakdown) => void
  onSaveAsDebt: (mb: MemberBillBreakdown) => void
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-accent/20 bg-accent/[0.04] p-4">
      <div className="flex items-center justify-between border-b border-border-inner pb-2 text-xs">
        <div>
          <span className="text-text-secondary">Total Tagihan Keseluruhan</span>
          <p className="font-mono text-base font-bold text-text-primary">{formatIDR(splitResult.grandTotal)}</p>
        </div>
        <div className="text-right text-[11px] text-text-secondary">
          <span>Pajak: {formatIDR(splitResult.taxAmount)}</span>
          {splitResult.serviceAmount > 0 && <span> · Service: {formatIDR(splitResult.serviceAmount)}</span>}
        </div>
      </div>

      {/* Individual Breakdown Cards */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {splitResult.memberBreakdowns.map((mb) => {
          const isSavedDebt = savedDebtIds[mb.memberId]
          const isCopied = copiedId === mb.memberId
          const isSelf = mb.name.toLowerCase() === 'saya'

          return (
            <div
              key={mb.memberId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-border-outer bg-surface p-3 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-text-primary">{mb.name}</p>
                  <span className="font-mono font-bold text-accent text-sm">{formatIDR(mb.totalDue)}</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Subtotal: {formatIDR(mb.subtotal)}
                  {mb.taxShare > 0 && ` + Pajak: ${formatIDR(mb.taxShare)}`}
                  {mb.serviceShare > 0 && ` + Svc: ${formatIDR(mb.serviceShare)}`}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onCopyWA(mb)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-outer bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary active:scale-95 cursor-pointer"
                  title="Salin rincian teks"
                >
                  {isCopied ? <Check className="h-3 w-3 text-accent-income" /> : <Copy className="h-3 w-3" />}
                  {isCopied ? 'Tersalin' : 'Salin'}
                </button>

                <button
                  type="button"
                  onClick={() => onShareWA(mb)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 px-2.5 py-1.5 text-[11px] font-semibold text-[#25D366] hover:bg-[#25D366]/25 active:scale-95 cursor-pointer"
                  title="Kirim ke WhatsApp"
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </button>

                {!isSelf && (
                  <button
                    type="button"
                    disabled={isSavedDebt || isPendingDebt}
                    onClick={() => onSaveAsDebt(mb)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-outer bg-white/[0.03] px-2 py-1.5 text-[11px] font-medium text-text-secondary hover:text-accent hover:border-accent/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Simpan sebagai piutang aktif"
                  >
                    <Wallet className="h-3 w-3" />
                    {isSavedDebt ? 'Tercatat ✓' : 'Piutang'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
