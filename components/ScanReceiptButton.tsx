'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [configured, setConfigured] = useState(true)

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
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Pindai struk"
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-text-primary shadow-lg ring-1 ring-border-outer disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>
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
