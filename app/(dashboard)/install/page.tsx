import Link from 'next/link'
import { ArrowLeft, Smartphone, ShieldCheck, Zap, WifiOff } from 'lucide-react'
import { PwaInstall } from '@/components/PwaInstall'

export const metadata = {
  title: 'Instal KASDESK',
  description: 'Pasang KASDESK di HP atau laptop untuk akses cepat dan dukungan offline.',
}

export default function InstallPage() {
  return (
    <main className="page-shell max-w-2xl">
      <Link href="/settings" className="back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Pengaturan
      </Link>

      <header className="page-header">
        <div>
          <p className="eyebrow">Aplikasi</p>
          <h1>Instal KASDESK</h1>
          <p>Pasang di perangkatmu untuk pengalaman seperti aplikasi native.</p>
        </div>
        <span className="icon-tile">
          <Smartphone className="h-5 w-5" aria-hidden />
        </span>
      </header>

      <section className="surface-card mb-6 rounded-3xl p-6">
        <h2 className="mb-2 text-base font-semibold">Pasang sekarang</h2>
        <p className="mb-5 text-sm text-text-secondary">
          Buka aplikasi langsung dari layar utama tanpa perlu membuka browser tiap kali ingin mencatat.
        </p>
        <PwaInstall />
      </section>

      <section className="surface-card rounded-3xl p-6">
        <h2 className="mb-4 text-base font-semibold">Kelebihan versi aplikasi</h2>
        <ul className="space-y-4 text-sm">
          <li className="flex items-start gap-3">
            <span className="icon-tile h-10 w-10 text-accent">
              <Zap className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-medium text-text-primary">Akses Instan & Cepat</p>
              <p className="mt-0.5 text-text-secondary">Dibuka langsung satu sentuhan dari homescreen atau desktop taskbar.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="icon-tile h-10 w-10 text-accent">
              <WifiOff className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-medium text-text-primary">Dukungan Mode Offline</p>
              <p className="mt-0.5 text-text-secondary">Catat pengeluaran saat sinyal jelek. Data otomatis disinkronkan saat online kembali.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="icon-tile h-10 w-10 text-accent">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="font-medium text-text-primary">Ringan & Hemat Kuota</p>
              <p className="mt-0.5 text-text-secondary">Hanya memakan sedikit memori dan aset ter-cache dengan efisien.</p>
            </div>
          </li>
        </ul>
      </section>
    </main>
  )
}
