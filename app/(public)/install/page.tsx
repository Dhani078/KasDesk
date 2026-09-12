import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Download, MonitorSmartphone, ShieldCheck, WifiOff } from 'lucide-react'
import { PwaInstall } from '@/components/PwaInstall'

const steps = [
  { title: 'Buka di browser utama', body: 'Gunakan Safari di iPhone/iPad atau Chrome/Edge di Android dan desktop.' },
  { title: 'Pilih Instal', body: 'Tekan tombol instal. Jika tombol tidak tersedia, ikuti petunjuk manual yang ditampilkan.' },
  { title: 'Buka dari layar utama', body: 'KASDESK berjalan seperti aplikasi dan menyiapkan pencatatan saat koneksi terputus.' },
]

export default function InstallPage() {
  return <main className="page-shell max-w-3xl">
    <Link href="/welcome" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali</Link>
    <header className="page-header"><div><p className="eyebrow">Progressive Web App</p><h1>Instal KASDESK</h1><p>Pasang tanpa toko aplikasi. Data akun tetap di server dan akses dilindungi sesi akunmu.</p></div><span className="icon-tile"><Download className="h-5 w-5" aria-hidden /></span></header>

    <section className="surface-card rounded-3xl p-5 sm:p-7" aria-labelledby="install-action"><div className="mb-5 flex items-start gap-3"><span className="icon-tile"><MonitorSmartphone className="h-5 w-5" aria-hidden /></span><div><h2 id="install-action" className="font-semibold">Siap dipasang</h2><p className="mt-1 text-sm leading-6 text-text-secondary">Tombol menyesuaikan dengan kemampuan browser dan perangkat.</p></div></div><PwaInstall /></section>

    <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Langkah instalasi">{steps.map((step, index) => <li key={step.title} className="surface-card rounded-2xl p-5"><span className="status-pill">Langkah {index + 1}</span><h2 className="mt-4 font-semibold">{step.title}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{step.body}</p></li>)}</ol>

    <section className="mt-6 grid gap-3 sm:grid-cols-2"><article className="rounded-2xl border border-border-outer p-5"><WifiOff className="h-5 w-5 text-accent" aria-hidden /><h2 className="mt-3 font-semibold">Saat offline</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Transaksi masuk antrean lokal dan dikirim saat koneksi kembali. Jangan hapus data situs sebelum antrean selesai.</p></article><article className="rounded-2xl border border-border-outer p-5"><ShieldCheck className="h-5 w-5 text-accent-income" aria-hidden /><h2 className="mt-3 font-semibold">Setelah terpasang</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Pastikan domain benar, gunakan perangkat terkunci, dan keluar pada perangkat bersama.</p></article></section>

    <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/register" className="primary-button flex-1"><CheckCircle2 className="h-4 w-4" aria-hidden /> Buat akun</Link><Link href="/login" className="secondary-button flex-1">Masuk ke KASDESK</Link></div>
  </main>
}
