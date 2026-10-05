'use client'

import { ArrowRightLeft, ArrowLeftRight } from 'lucide-react'
import { formatIDR } from '@/lib/format'

type WalletLite = { id: string; name: string; balance: number }

export function TransferWalletsBox({
  wallets,
  walletSel,
  effectiveToWallet,
  onWalletChange,
  onToWalletChange,
  onSwapWallets,
  categoryTag,
}: {
  wallets: WalletLite[]
  walletSel: string
  effectiveToWallet: string
  onWalletChange: (id: string) => void
  onToWalletChange: (id: string) => void
  onSwapWallets: () => void
  categoryTag: string
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border-outer bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer Antar Dompet
        </span>
        {wallets.length >= 2 && (
          <button
            type="button"
            onClick={onSwapWallets}
            className="!min-h-0 !min-w-0 flex items-center gap-1 rounded-lg border border-border-outer bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent/10 active:scale-95 transition"
            title="Tukar dompet asal dan tujuan"
          >
            <ArrowLeftRight className="h-3 w-3" /> Tukar Posisi
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="transfer_from_wallet_id" className="mb-1 block text-xs text-text-secondary">
            Dari Dompet (Asal)
          </label>
          <select
            id="transfer_from_wallet_id"
            name="wallet_id"
            value={walletSel}
            onChange={(e) => onWalletChange(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} · {formatIDR(w.balance)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="to_wallet_id" className="mb-1 block text-xs text-text-secondary">
            Ke Dompet (Tujuan)
          </label>
          <select
            id="to_wallet_id"
            name="to_wallet_id"
            value={effectiveToWallet}
            onChange={(e) => onToWalletChange(e.target.value)}
            required
            className="w-full rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id} disabled={w.id === walletSel}>
                {w.name} · {formatIDR(w.balance)} {w.id === walletSel ? '(Dompet Asal)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {wallets.length < 2 && (
        <p className="text-xs font-medium text-amber-500">
          Dibutuhkan minimal 2 dompet untuk transfer saldo. Buat dompet baru di menu Dompet.
        </p>
      )}
      {walletSel === effectiveToWallet && wallets.length >= 2 && (
        <p className="text-xs font-medium text-danger">
          Dompet asal dan tujuan tidak boleh sama. Silakan pilih dompet tujuan yang berbeda.
        </p>
      )}
      <input type="hidden" name="category_tag" value={categoryTag} />
    </div>
  )
}
