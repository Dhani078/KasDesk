'use client'

import type { ScanResult } from '@/components/ScanReceiptButton'

const SCAN_REASON_MAP: Record<string, string> = {
  UNREADABLE_TOTAL: 'Total struk tidak terbaca jelas. Mohon periksa kembali nominal di atas.',
  LOW_CONFIDENCE: 'AI membaca struk dengan kepastian rendah. Silakan pastikan nominal dan kategori sudah pas.',
  OUT_OF_BOUNDS: 'Nominal terdeteksi di luar batas wajar. Mohon sesuaikan nominal.',
  TOTAL_MISMATCH: 'Rincian barang berbeda dengan total bayar (mungkin ada pajak/diskon). Cek kembali nominal.',
}

export function ScanWarningBanner({ scan }: { scan: ScanResult | null }) {
  if (!scan || !scan.needs_confirmation) return null

  const message =
    SCAN_REASON_MAP[scan.reason ?? ''] ??
    scan.reason ??
    'AI membaca struk dengan kepastian rendah.'

  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200"
    >
      <p className="font-semibold">Periksa nominal hasil scan</p>
      <p className="mt-0.5 text-amber-200/80">{message}</p>
    </div>
  )
}
