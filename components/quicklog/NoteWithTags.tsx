'use client'

import { POPULAR_TAGS, toggleTagInNote } from '@/lib/tags'

export function NoteWithTags({
  noteText,
  setNoteText,
}: {
  noteText: string
  setNoteText: React.Dispatch<React.SetStateAction<string>>
}) {
  return (
    <div>
      <label htmlFor="note" className="mb-1 block text-xs text-text-secondary">
        Catatan &amp; Label (#Tag)
      </label>
      <input
        id="note"
        name="note"
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        maxLength={500}
        placeholder="Contoh: Makan malam #Liburan #Keluarga"
        className="w-full rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-text-secondary">Tag:</span>
        {POPULAR_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setNoteText((prev) => toggleTagInNote(prev, tag))}
            className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition active:scale-95 ${
              noteText.toLowerCase().includes(tag.toLowerCase())
                ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                : 'border border-border-outer bg-white/[0.03] text-text-secondary hover:text-text-primary'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  )
}
