'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { RefreshCw, ArrowLeft } from 'lucide-react'

/**
 * Shown when a Server Component throws (DB unreachable, query error, …).
 * Without this file Next renders a blank screen or a raw stack trace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // In production this is where you would report to Sentry/etc.
    console.error('[KASDESK] render error:', error)
  }, [error])

  const offline = /fetch failed|ECONNREFUSED|ETIMEDOUT|getaddrinfo/i.test(error.message)

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-2 text-lg font-semibold text-text-primary">
        {offline ? 'Tidak bisa terhubung' : 'Terjadi kesalahan'}
      </h1>
      <p className="mb-6 max-w-xs text-sm text-text-secondary">
        {offline
          ? 'Koneksi ke database gagal. Periksa jaringan Anda, lalu coba lagi.'
          : 'Data tidak bisa dimuat saat ini. Coba lagi sebentar.'}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Coba lagi
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-text-secondary ring-1 ring-border-outer"
        >
          <ArrowLeft className="h-4 w-4" />
          Beranda
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 font-mono text-xs text-text-secondary">
          Ref: {error.digest}
        </p>
      )}
    </main>
  )
}
