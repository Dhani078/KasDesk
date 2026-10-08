'use client'

import { useState, useEffect } from 'react'
import { Users, User, Plus, Check, ChevronDown, X, Loader2 } from 'lucide-react'
import {
  ACTIVE_SPACE_STORAGE_KEY,
  ACTIVE_SPACE_EVENT,
  type SharedSpaceMeta,
} from '@/lib/spaces'
import { createSharedSpace } from '@/lib/spaces/actions'

export function SpaceSwitcher({
  initialSpaces = [],
}: {
  initialSpaces?: SharedSpaceMeta[]
}) {
  const [spaces, setSpaces] = useState<SharedSpaceMeta[]>(initialSpaces)
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(ACTIVE_SPACE_STORAGE_KEY)
      if (stored && initialSpaces.some((s) => s.id === stored)) {
        return stored
      }
    } catch {}
    return null
  })
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dropdownOpen && !modalOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalOpen) setModalOpen(false)
        if (dropdownOpen) setDropdownOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dropdownOpen, modalOpen])

  function switchSpace(id: string | null) {
    setActiveSpaceId(id)
    setDropdownOpen(false)
    try {
      if (id) {
        localStorage.setItem(ACTIVE_SPACE_STORAGE_KEY, id)
      } else {
        localStorage.removeItem(ACTIVE_SPACE_STORAGE_KEY)
      }
      window.dispatchEvent(new CustomEvent(ACTIVE_SPACE_EVENT, { detail: { spaceId: id } }))
    } catch {}
  }

  async function handleCreateSpace(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const res = await createSharedSpace({ name, description: desc || undefined })
    setPending(false)

    if (!res.success) {
      setError(res.error.message)
      return
    }

    const newSpace: SharedSpaceMeta = {
      id: res.data.id,
      name,
      description: desc || null,
      ownerUserId: '',
      role: 'owner',
    }
    setSpaces((prev) => [...prev, newSpace])
    switchSpace(newSpace.id)
    setModalOpen(false)
    setName('')
    setDesc('')
  }

  const activeSpace = spaces.find((s) => s.id === activeSpaceId)

  return (
    <>
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-xl border border-border-outer bg-surface/80 px-2.5 py-1.5 text-xs font-medium text-text-primary transition hover:border-accent/40 active:scale-95"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          {activeSpaceId && activeSpace ? (
            <>
              <Users className="h-3.5 w-3.5 text-accent" />
              <span className="max-w-[120px] truncate">{activeSpace.name}</span>
            </>
          ) : (
            <>
              <User className="h-3.5 w-3.5 text-text-secondary" />
              <span>Dompet Pribadi</span>
            </>
          )}
          <ChevronDown className={`h-3 w-3 text-text-secondary transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div
            className="absolute left-0 mt-1.5 z-40 w-56 origin-top-left rounded-2xl border border-border-outer bg-surface p-1.5 shadow-xl animate-fade-in-up"
            role="menu"
          >
            <div className="px-2 py-1 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Ruang Kerja Keuangan
            </div>

            <button
              type="button"
              onClick={() => switchSpace(null)}
              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition ${
                activeSpaceId === null
                  ? 'bg-accent/15 text-accent font-semibold'
                  : 'text-text-primary hover:bg-white/[0.04]'
              }`}
              role="menuitem"
            >
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                <span>Dompet Pribadi</span>
              </div>
              {activeSpaceId === null && <Check className="h-3.5 w-3.5" />}
            </button>

            {spaces.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => switchSpace(s.id)}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition ${
                  activeSpaceId === s.id
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-text-primary hover:bg-white/[0.04]'
                }`}
                role="menuitem"
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="rounded bg-white/[0.06] px-1 py-0.5 text-[10px] text-text-secondary uppercase">
                    {s.role}
                  </span>
                  {activeSpaceId === s.id && <Check className="h-3.5 w-3.5 ml-1" />}
                </div>
              </button>
            ))}

            <div className="my-1 border-t border-border-inner" />

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false)
                setModalOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-accent hover:bg-accent/10 transition"
              role="menuitem"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Buat Ruang Bersama</span>
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buat Ruang Bersama"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border-outer bg-surface p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/15 text-accent">
                  <Users className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-text-primary">Ruang Bersama Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-text-secondary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Kelola kas bersama pasangan atau rekan satu kos tanpa mencampuradukkan dompet pribadi.
            </p>

            <form onSubmit={handleCreateSpace} className="space-y-3">
              <div>
                <label htmlFor="space-name" className="block text-xs text-text-secondary mb-1">
                  Nama Ruang
                </label>
                <input
                  id="space-name"
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kas Rumah Tangga Kita"
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <label htmlFor="space-desc" className="block text-xs text-text-secondary mb-1">
                  Deskripsi (Opsional)
                </label>
                <input
                  id="space-desc"
                  type="text"
                  maxLength={255}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Anggaran belanja dapur & listrik"
                  className="w-full rounded-xl border border-border bg-canvas px-3.5 py-2.5 text-xs text-text-primary outline-none focus:border-accent"
                />
              </div>

              {error && <p role="alert" className="text-xs text-danger">{error}</p>}

              <button
                type="submit"
                disabled={pending || !name.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-solid py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {pending ? 'Membuat…' : 'Buat Ruang'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
