import Link from 'next/link'
import { ArrowLeft, ChevronRight, Download, FileText, KeyRound, Settings2, ShieldCheck, Smartphone, Target } from 'lucide-react'
import { PrivacyToggle } from '@/components/PrivacyToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DeleteAccountForm } from '@/components/DeleteAccountForm'
import { ChangePasswordForm } from '@/components/ChangePasswordForm'

const rows = [
  { href: '/planning', Icon: Target, title: 'Budget & pengingat', body: 'Atur batas kategori dan transaksi rutin.' },
  { href: '/install', Icon: Smartphone, title: 'Instal aplikasi', body: 'Pasang di iPhone, Android, atau laptop.' },
]

export default function SettingsPage() {
  return <main className="page-shell max-w-2xl">
    <Link href="/" className="back-link"><ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard</Link>
    <header className="page-header"><div><p className="eyebrow">Kontrol</p><h1>Pengaturan</h1><p>Atur tampilan, privasi, keamanan, dan data akunmu.</p></div><span className="icon-tile"><Settings2 className="h-5 w-5" aria-hidden /></span></header>

    <section className="mb-8"><h2 className="section-title mb-3">Tampilan & privasi</h2><div className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl"><div className="setting-row"><PrivacyToggle /><div><p className="font-medium">Sembunyikan nominal</p><p className="text-sm text-text-secondary">Nyaman digunakan di tempat umum.</p></div></div><div className="setting-row"><ThemeToggle /><div><p className="font-medium">Tema aplikasi</p><p className="text-sm text-text-secondary">Beralih antara terang dan gelap.</p></div></div></div></section>

    <section className="mb-8"><h2 className="section-title mb-3">Aplikasi & data</h2><div className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl">{rows.map(({href,Icon,title,body}) => <Link key={href} href={href} className="setting-row group"><span className="icon-tile"><Icon className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><b className="block font-medium">{title}</b><span className="text-sm text-text-secondary">{body}</span></span><ChevronRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" aria-hidden /></Link>)}<a href="/api/export" download className="setting-row group"><span className="icon-tile"><Download className="h-5 w-5" aria-hidden /></span><span className="min-w-0 flex-1"><b className="block font-medium">Export data</b><span className="text-sm text-text-secondary">Unduh seluruh data akun dalam JSON.</span></span><ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden /></a></div></section>

    <section className="mb-8"><h2 className="section-title mb-3">Dokumen</h2><div className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl"><Link href="/privacy" className="setting-row"><ShieldCheck className="h-5 w-5 text-accent" aria-hidden /><span className="flex-1">Kebijakan privasi</span><ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden /></Link><Link href="/terms" className="setting-row"><FileText className="h-5 w-5 text-accent" aria-hidden /><span className="flex-1">Ketentuan penggunaan</span><ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden /></Link></div></section>

    <section className="surface-card mb-6 rounded-3xl p-5 sm:p-6"><div className="flex items-center gap-3"><span className="icon-tile"><KeyRound className="h-5 w-5" aria-hidden /></span><div><h2 className="font-semibold">Ubah password</h2><p className="text-sm text-text-secondary">Sesi lama otomatis ditolak.</p></div></div><ChangePasswordForm /></section>
    <section className="rounded-3xl border border-danger/30 bg-danger/5 p-5 sm:p-6"><h2 className="font-semibold text-danger">Zona berbahaya</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Export data terlebih dahulu. Penghapusan akun tidak dapat dibatalkan.</p><DeleteAccountForm /></section>
  </main>
}
