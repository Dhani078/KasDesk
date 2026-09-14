'use client'

import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react'

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
}: {
  onResult: (r: ScanResult) => void
  onUnavailable?: (reason: string) => void
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [configured, setConfigured] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return

    if (file.size > MAX_BYTES) {
      onUnavailable?.('Ukuran gambar lebih dari 10 MB.')
      return
    }

    // Downscale client-side (spec §1.1 step 2) — keeps upload cheap and
    // stays under the model's input limits.
    let blob: Blob = file
    try {
      blob = await downscale(file, 1600)
    } catch {
      // Downscale is an optimisation; the original still works.
    }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('image', blob, 'receipt.jpg')
      const res = await fetch('/api/scan-receipt', { method: 'POST', body: fd })
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
    } catch {
      onUnavailable?.('Tidak dapat terhubung. Silakan catat manual.')
    } finally {
      setBusy(false)
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
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-text-primary shadow-lg ring-1 ring-border-outer disabled:opacity-60 transition active:scale-95 hover:border-accent/40"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
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
