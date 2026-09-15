'use client'

import { useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react'
import { downscale } from '@/lib/ocr/image-utils'
import { ScanProgressModal } from '@/components/scanner/ScanProgressModal'

export type ScanResult = {
  merchant_name: string
  items: { name: string; price: number; quantity: number }[]
  detected_total: number
  confidence_score: number
  detected_category: string
  detected_date?: string | null
  needs_confirmation: boolean
  reason?: string
}

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Receipt scanner trigger button with Camera and Gallery options.
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

    // Downscale client-side to keep upload cheap and stay within model limits
    let blob: Blob = file
    try {
      blob = await downscale(file, 1600)
    } catch {
      // Downscale is an optimisation; the original still works
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
        return // User voluntarily cancelled
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

      {/* Gallery / File Picker Input */}
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
        <ScanProgressModal
          previewUrl={previewUrl}
          scanStep={scanStep}
          onCancel={cancelScan}
        />
      )}
    </>
  )
}
