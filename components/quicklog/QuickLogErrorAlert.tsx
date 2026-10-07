import { X } from 'lucide-react'

export function QuickLogErrorAlert({
  error,
  onClear,
}: {
  error: string | null
  onClear: () => void
}) {
  if (!error) return null

  return (
    <div
      role="alert"
      className="mb-4 flex items-start justify-between gap-2 rounded-2xl border border-danger/30 bg-danger/10 p-3 text-xs font-medium text-danger animate-fade-in-up"
    >
      <span>{error}</span>
      <button
        type="button"
        onClick={onClear}
        className="text-danger hover:opacity-70 p-0.5 cursor-pointer"
        aria-label="Tutup pesan error"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
