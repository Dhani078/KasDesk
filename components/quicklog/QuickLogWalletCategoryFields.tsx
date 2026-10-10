'use client'

import { formatIDR } from '@/lib/format'

type WalletLite = { id: string; name: string; balance: number }

export function QuickLogWalletCategoryFields({
  wallets,
  walletSel,
  onWalletChange,
  catSel,
  catOrder,
  onPickCat,
}: {
  wallets: WalletLite[]
  walletSel: string
  onWalletChange: (id: string) => void
  catSel: string
  catOrder: string[]
  onPickCat: (c: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor="wallet_id" className="mb-1 block text-xs text-text-secondary">
          Dompet
        </label>
        <select
          id="wallet_id"
          name="wallet_id"
          value={walletSel}
          onChange={(e) => onWalletChange(e.target.value)}
          required
          className="w-full rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-text-primary outline-none focus:border-accent"
        >
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {formatIDR(w.balance)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="category_tag" className="mb-1 block text-xs text-text-secondary">
          Kategori
        </label>
        <input type="hidden" name="category_tag" value={catSel} />
        <div
          role="radiogroup"
          aria-label="Kategori"
          className="flex flex-wrap gap-1.5"
        >
          {catOrder.map((c) => (
            <button
              type="button"
              key={c}
              role="radio"
              aria-checked={catSel === c}
              onClick={() => onPickCat(c)}
              className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                catSel === c
                  ? 'bg-accent-solid text-white'
                  : 'bg-white/[0.04] text-text-secondary ring-1 ring-border-outer'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
