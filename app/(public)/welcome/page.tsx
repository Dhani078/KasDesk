import Link from 'next/link'
import { ArrowRight, BarChart3, Cloud, LockKeyhole, ReceiptText, Smartphone, WalletCards } from 'lucide-react'
import { PwaInstall } from '@/components/PwaInstall'

const FEATURES = [
  { Icon: ReceiptText, title: 'Catat lebih cepat', body: 'Pemasukan, pengeluaran, transfer, dan pemindaian struk dalam satu alur.' },
  { Icon: BarChart3, title: 'Laporan yang jelas', body: 'Pantau arus kas, tren mingguan, kategori, utang, dan target tabungan.' },
  { Icon: Cloud, title: 'Tetap siap saat offline', body: 'Transaksi diantrekan di perangkat dan disinkronkan saat koneksi kembali.' },
  { Icon: LockKeyhole, title: 'Privat secara bawaan', body: 'Data setiap akun terisolasi dan koneksi database dilindungi TLS.' },
]

export default function WelcomePage() {
  return (
    <main className="min-h-dvh overflow-hidden px-5 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between" aria-label="Navigasi landing">
          <Link href="/welcome" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-solid text-white"><WalletCards className="h-5 w-5" aria-hidden /></span>
            KASDESK
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition hover:bg-white/[0.04] hover:text-text-primary">Masuk</Link>
            <Link href="/register" className="min-h-11 rounded-xl bg-text-primary px-4 py-2.5 text-sm font-semibold text-canvas transition hover:opacity-90">Mulai</Link>
          </div>
        </nav>

        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Keuangan pribadi, tanpa ribet</p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-text-primary sm:text-6xl">Uangmu terlihat jelas. Keputusan terasa lebih tenang.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg">KASDESK menyatukan dompet, transaksi, tabungan, utang, OCR struk, dan laporan dalam aplikasi web yang bisa dipasang di iPhone, Android, dan laptop.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-solid px-6 font-semibold text-white transition hover:brightness-110">Buat akun <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href="/login" className="flex min-h-12 items-center justify-center rounded-xl border border-border-outer bg-surface px-6 font-semibold text-text-primary transition hover:bg-white/[0.05]">Buka dashboard</Link>
            </div>
          </div>

          <div className="surface-card relative rounded-3xl p-5 sm:p-7">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-xs uppercase tracking-[0.12em] text-text-secondary">Contoh tampilan · bukan data pengguna</p><p className="mt-1 font-mono text-3xl font-semibold">Rp12.450.000</p></div>
              <Smartphone className="h-6 w-6 text-accent" aria-hidden />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border-inner bg-black/10 p-4"><p className="text-xs text-text-secondary">Pemasukan</p><p className="mt-1 font-mono text-lg text-accent-income">Rp8,5 jt</p></div>
              <div className="rounded-2xl border border-border-inner bg-black/10 p-4"><p className="text-xs text-text-secondary">Pengeluaran</p><p className="mt-1 font-mono text-lg text-accent-expense">Rp2,18 jt</p></div>
            </div>
            <div role="img" aria-label="Contoh grafik pengeluaran tujuh hari" className="mt-4 flex h-24 items-end gap-2 rounded-2xl border border-border-inner bg-black/10 p-4">
              {[38,62,44,78,52,88,66].map((height,index)=><span key={index} className="flex-1 rounded-t bg-accent/75" style={{height:`${height}%`}} />)}
            </div>
            <div className="mt-5"><PwaInstall /></div>
          </div>
        </section>

        <section className="grid gap-3 border-t border-border-outer py-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({Icon,title,body})=><article key={title} className="rounded-2xl border border-border-outer bg-surface/60 p-5"><Icon className="h-5 w-5 text-accent" aria-hidden /><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></article>)}
        </section>
      </div>
    </main>
  )
}
