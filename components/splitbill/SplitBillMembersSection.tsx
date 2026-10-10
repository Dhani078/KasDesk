'use client'

import { Plus, X } from 'lucide-react'
import type { SplitMember } from '@/lib/split-bill'

export function SplitBillMembersSection({
  members,
  onRemoveMember,
  newMemberName,
  onNewMemberNameChange,
  onAddMember,
}: {
  members: SplitMember[]
  onRemoveMember: (id: string) => void
  newMemberName: string
  onNewMemberNameChange: (val: string) => void
  onAddMember: () => void
}) {
  return (
    <div className="space-y-2 text-xs">
      <span className="font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
        Partisipan ({members.length})
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {members.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs border border-border-outer text-text-primary"
          >
            <span>{m.name}</span>
            {members.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveMember(m.id)}
                className="text-text-secondary hover:text-danger cursor-pointer ml-0.5"
                aria-label={`Hapus ${m.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newMemberName}
          onChange={(e) => onNewMemberNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAddMember()
            }
          }}
          placeholder="Nama teman baru..."
          className="flex-1 rounded-xl border border-border bg-canvas px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={onAddMember}
          className="inline-flex items-center gap-1 rounded-xl bg-white/[0.06] border border-border-outer px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-white/[0.1] active:scale-95 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah
        </button>
      </div>
    </div>
  )
}
