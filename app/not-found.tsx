import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="mb-1 font-mono text-4xl font-semibold text-text-secondary">404</p>
      <h1 className="mb-2 text-lg font-semibold text-text-primary">
        Halaman tidak ditemukan
      </h1>
      <p className="mb-6 max-w-xs text-sm text-text-secondary">
        Tautan mungkin sudah berubah, atau halaman ini tidak pernah ada.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-accent-solid px-4 py-3 text-sm font-semibold text-white"
      >
        Kembali ke beranda
      </Link>
    </main>
  )
}
