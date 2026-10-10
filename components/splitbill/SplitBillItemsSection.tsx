'use client'

import { Trash2 } from 'lucide-react'
import type { SplitItem, SplitMember } from '@/lib/split-bill'
import { formatIDR } from '@/lib/format'

export function SplitBillItemsSection({
  items,
  members,
  onRemoveItem,
  newItemName,
  onNewItemNameChange,
  newItemPrice,
  onNewItemPriceChange,
  newItemAssign,
  onNewItemAssignChange,
  onAddItem,
}: {
  items: SplitItem[]
  members: SplitMember[]
  onRemoveItem: (id: string) => void
  newItemName: string
  onNewItemNameChange: (val: string) => void
  newItemPrice: string
  onNewItemPriceChange: (val: string) => void
  newItemAssign: string
  onNewItemAssignChange: (val: string) => void
  onAddItem: () => void
}) {
  return (
    <div className="space-y-2 text-xs">
      <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
        Daftar Pesanan ({items.length})
      </span>
      <div className="max-h-36 overflow-y-auto divide-y divide-border-inner rounded-2xl border border-border-outer bg-canvas/60">
        {items.map((it) => {
          const targetName =
            it.assignedMemberIds.length === 0
              ? 'Bagi Rata Semua'
              : members.find((m) => m.id === it.assignedMemberIds[0])?.name || 'Tertentu'
          return (
            <div key={it.id} className="flex items-center justify-between p-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary truncate">{it.name}</p>
                <p className="text-[11px] text-text-secondary">
                  Untuk: <span className="text-accent font-medium">{targetName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-semibold text-text-primary">
                  {formatIDR(it.price * Math.max(1, it.quantity))}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(it.id)}
                  className="text-text-secondary hover:text-danger p-1 cursor-pointer"
                  aria-label={`Hapus ${it.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Item Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => onNewItemNameChange(e.target.value)}
          placeholder="Nama menu..."
          className="rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
        />
        <input
          type="text"
          inputMode="numeric"
          value={newItemPrice}
          onChange={(e) => onNewItemPriceChange(e.target.value)}
          placeholder="Harga (Rp)..."
          className="rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
        />
        <div className="flex items-center gap-1.5">
          <select
            value={newItemAssign}
            onChange={(e) => onNewItemAssignChange(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-canvas px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
          >
            <option value="all">Bagi Rata</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onAddItem}
            className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
