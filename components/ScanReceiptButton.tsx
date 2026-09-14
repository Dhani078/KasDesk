'use client'

import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Loader2, X, Receipt, Sparkles } from 'lucide-react'

export type ScanResult = {
  merchant_name: string
  items: { name: string; price: number; quantity: number }[]
  detected_total: number
  confidence_score: number
  detected_category: string
  needs_confirmation: boolean
  reason?: string
}

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Receipt scanner.
 *
 * Design constraint from AI-OCR-SPEC §8: OCR is an accelerator, never a
 * blocker. Every failure path therefore degrades to "open the manual form",
 * and if OCR is not configured the button hides itself entirely — a visible
 * but permanently broken button is worse than no button.
 */
export function ScanReceiptButton({
  onResult,
  onUnavailable,
  variant = 'compact',
}: {
  onResult: (r: ScanResult) => void
  onUnavailable?: (reason: string) => void
  variant?: 'pill' | 'icon' | 'compact'
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const abortCtrlRef = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [configured, setConfigured] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  function cancelScan() {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort()
      abortCtrlRef.current = null
    }
    setBusy(false)
    setScanStep(0)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return

    if (file.size > MAX_BYTES) {
      onUnavailable?.('Ukuran gambar lebih dari 10 MB.')
      return
    }

    setMenuOpen(false)

    // Downscale client-side (spec §1.1 step 2) — keeps upload cheap and
    // stays under the model's input limits.
    let blob: Blob = file
    try {
      blob = await downscale(file, 1600)
    } catch {
      // Downscale is an optimisation; the original still works.
    }

    const objectUrl = URL.createObjectURL(blob)
    setPreviewUrl(objectUrl)
    setBusy(true)
    setScanStep(0)

    const stepTimer = setInterval(() => {
      setScanStep((prev) => (prev < 2 ? prev + 1 : prev))
    }, 1800)

    const controller = new AbortController()
    abortCtrlRef.current = controller

    try {
      const fd = new FormData()
      fd.append('image', blob, 'receipt.jpg')
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        body: fd,
        signal: controller.signal,
      })
      const json = await res.json()

      if (res.status === 503 || json?.error === 'OCR_NOT_CONFIGURED') {
        setConfigured(false)
        onUnavailable?.('OCR belum dikonfigurasi.')
        return
      }
      if (!res.ok) {
        onUnavailable?.(
          json?.error === 'RATE_LIMITED'
            ? 'Terlalu banyak scan. Coba lagi nanti.'
            : 'Scan gagal. Silakan catat manual.',
        )
        return
      }
      onResult(json as ScanResult)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User voluntarily cancelled
        return
      }
      onUnavailable?.('Tidak dapat terhubung. Silakan catat manual.')
    } finally {
      clearInterval(stepTimer)
      abortCtrlRef.current = null
      setBusy(false)
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
      setScanStep(0)
    }
  }

  if (!configured) return null

  return (
    <>
      {/* Direct Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />

      {/* Gallery / File Picker Input (No capture constraint: allows picking from photo gallery) */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        disabled={busy}
        aria-label="Pindai struk"
        className={
          variant === 'compact'
            ? 'inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent shadow-sm transition hover:bg-accent/20 active:scale-95 disabled:opacity-60'
            : variant === 'pill'
              ? 'flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-text-primary transition hover:bg-white/[0.08] active:scale-95 disabled:opacity-60'
              : 'flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-text-primary shadow-lg ring-1 ring-border-outer disabled:opacity-60 transition active:scale-95 hover:border-accent/40'
        }
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        ) : (
          <Camera className="h-3.5 w-3.5 text-accent" />
        )}
        {variant === 'compact' && <span>Scan Struk</span>}
        {variant === 'pill' && <span>Scan</span>}
      </button>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setMenuOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pilih sumber foto struk"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-3xl border border-border-outer bg-surface p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-border-inner">
              <h3 className="text-sm font-semibold text-text-primary">Scan Struk Belanja</h3>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-lg"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  cameraInputRef.current?.click()
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-border-outer bg-white/[0.03] p-3 text-left transition hover:border-accent/40 hover:bg-white/[0.06] active:scale-95"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
                  <Camera className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">Ambil Foto Langsung</p>
                  <p className="text-[11px] text-text-secondary">Gunakan kamera HP sekarang</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  galleryInputRef.current?.click()
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-border-outer bg-white/[0.03] p-3 text-left transition hover:border-accent/40 hover:bg-white/[0.06] active:scale-95"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-income/15 text-accent-income">
                  <ImageIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-text-primary">Pilih dari Galeri / File</p>
                  <p className="text-[11px] text-text-secondary">Pilih foto nota yang sudah tersimpan</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {busy && (
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
              onClick={cancelScan}
              className="w-full rounded-xl border border-border-outer bg-white/[0.04] py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.08] active:scale-95 transition"
            >
              Batalkan Pemindaian
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** Resize to at most `max` px on the long edge, as JPEG. */
async function downscale(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  if (scale === 1) return file

  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.85,
    )
  })
}
