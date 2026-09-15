'use client'

import { Receipt, Sparkles } from 'lucide-react'

export function ScanProgressModal({
  previewUrl,
  scanStep,
  onCancel,
}: {
  previewUrl: string | null
  scanStep: number
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Memindai struk dengan AI"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
    >
      <div className="relative w-full max-w-xs sm:max-w-sm rounded-3xl border border-border-outer bg-surface p-6 shadow-2xl text-center space-y-5">
        {/* Visual Scanner Box with Laser Beam */}
        <div className="relative mx-auto h-36 w-36 rounded-2xl bg-canvas border border-accent/30 overflow-hidden flex items-center justify-center shadow-inner">
          {/* Animated Laser Scanning Line */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_14px_rgba(79,127,232,1)] animate-scan-beam z-10" />

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview struk"
              className="h-full w-full object-cover opacity-60 filter blur-[0.5px]"
            />
          ) : (
            <Receipt className="h-16 w-16 text-accent/50" />
          )}
          <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
        </div>

        {/* Dynamic Step Text */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-accent text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Scanner KasDesk</span>
          </div>
          <h3 className="text-base font-semibold text-text-primary">
            {scanStep === 0 && 'Mempersiapkan Gambar...'}
            {scanStep === 1 && 'Membaca Rincian & QRIS...'}
            {scanStep === 2 && 'Mengekstrak Nominal...'}
          </h3>
          <p className="text-xs text-text-secondary">
            {scanStep === 0 && 'Mengompresi berkas untuk pemindaian cepat.'}
            {scanStep === 1 && 'Mendeteksi toko, nominal transfer, & struk.'}
            {scanStep === 2 && 'Hampir selesai! Menyesuaikan formulir.'}
          </p>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-xl border border-border-outer bg-white/[0.04] py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.08] active:scale-95 transition"
        >
          Batalkan Pemindaian
        </button>
      </div>
    </div>
  )
}
