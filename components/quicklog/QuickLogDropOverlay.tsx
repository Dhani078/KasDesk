import { Sparkles } from 'lucide-react'

export function QuickLogDropOverlay({ isDragging }: { isDragging: boolean }) {
  if (!isDragging) return null
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-t-3xl bg-surface/95 backdrop-blur-md p-6 text-center border-2 border-dashed border-accent">
      <Sparkles className="h-10 w-10 text-accent animate-bounce mb-2" />
      <p className="font-semibold text-text-primary text-sm">Lepaskan gambar struk di sini</p>
      <p className="text-xs text-text-secondary mt-1">Gemini 3.8 Flash akan memindai transaksi otomatis</p>
    </div>
  )
}
