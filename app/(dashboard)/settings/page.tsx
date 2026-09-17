import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Target,
  BarChart3,
  Landmark,
  PiggyBank,
  Sparkles,
} from 'lucide-react'

import { auth } from '@/auth'
import { getDashboardSummary } from '@/lib/analytics/actions'
import { PrivacyToggle } from '@/components/PrivacyToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { DeleteAccountForm } from '@/components/DeleteAccountForm'
import { ChangePasswordForm } from '@/components/ChangePasswordForm'
import { AppLockSettings } from '@/components/AppLockSettings'
import { LogoutButton } from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'

const financeRows = [
  {
    href: '/insights',
    Icon: BarChart3,
    title: 'Laporan & Analisis',
    body: 'Grafik mutasi, pengeluaran kategori, rekap bulanan WhatsApp & PDF.',
    badge: 'Laporan',
  },
  {
    href: '/debts',
    Icon: Landmark,
    title: 'Catatan Utang & Piutang',
    body: 'Pantau pinjaman uang dan tagih via WhatsApp dengan pesan otomatis.',
    badge: 'Utang',
  },
  {
    href: '/planning',
    Icon: Target,
    title: 'Budget & Pengingat Rutin',
    body: 'Atur batas anggaran bulanan dan transaksi rutin 1-klik.',
    badge: 'Budget',
  },
  {
    href: '/vaults',
    Icon: PiggyBank,
    title: 'Brankas & Target Impian',
    body: 'Alokasi tabungan khusus untuk dana darurat, liburan, dan barang impian.',
    badge: 'Tabungan',
  },
  {
    href: '/coach',
    Icon: Sparkles,
    title: 'Asisten AI Finansial (Coach)',
    body: 'Analisis cerdas pola belanja dan rekomendasi hemat personal.',
    badge: 'AI Coach',
  },
]

const appRows = [
  {
    href: '/install',
    Icon: Smartphone,
    title: 'Instal Aplikasi',
    body: 'Pasang KasDesk di HP Android, iPhone, atau laptop (PWA).',
  },
]

const exportRows = [
  {
    href: '/api/export/csv',
    Icon: FileSpreadsheet,
    title: 'Export Transaksi CSV',
    body: 'Unduh tabel mutasi untuk dibuka di Excel atau Google Sheets.',
  },
  {
    href: '/api/export',
    Icon: Download,
    title: 'Export Lengkap JSON',
    body: 'Salinan cadangan lengkap seluruh data akunmu.',
  },
]

const legalRows = [
  {
    href: '/privacy',
    Icon: ShieldCheck,
    title: 'Kebijakan Privasi',
  },
  {
    href: '/terms',
    Icon: FileText,
    title: 'Ketentuan Penggunaan',
  },
]

export default async function SettingsPage() {
  const [session, dash] = await Promise.all([
    auth(),
    getDashboardSummary().catch(() => null),
  ])

  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Pengguna'
  const userEmail = session?.user?.email || ''
  const initial = userName.slice(0, 2).toUpperCase()

  return (
    <main className="page-shell max-w-2xl pb-32">
      <Link href="/" className="back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Dashboard
      </Link>

      {/* Header Profile Card */}
      <section className="surface-card mb-8 overflow-hidden rounded-3xl p-5 sm:p-6 border border-border-outer bg-surface">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-solid text-lg font-bold text-white shadow-md">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-bold tracking-tight text-text-primary capitalize sm:text-xl">
                  {userName}
                </h1>
                <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                  Aktif
                </span>
              </div>
              <p className="truncate text-xs text-text-secondary mt-0.5">{userEmail}</p>
            </div>
          </div>

          {dash && (
            <Link
              href="/insights"
              className="flex items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/5 px-3.5 py-2.5 transition hover:bg-accent/10 active:scale-95"
              title="Lihat Laporan & Skor Finansial"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider text-text-secondary">Health Score</p>
                  <p className="text-xs font-bold text-accent">{dash.healthLabel}</p>
                </div>
              </div>
              <span className="font-mono text-base font-bold text-accent">{dash.healthScore}</span>
            </Link>
          )}
        </div>
      </section>

      {/* 1. Fitur Finansial & Laporan Hub */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Fitur & Laporan Keuangan</h2>
          <span className="text-xs text-text-secondary">Hub finansial</span>
        </div>
        <div className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl">
          {financeRows.map(({ href, Icon, title, body, badge }) => (
            <Link key={href} href={href} className="setting-row group">
              <span className="icon-tile">
                <Icon className="h-5 w-5 text-accent" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <b className="block font-medium text-text-primary">{title}</b>
                  <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                    {badge}
                  </span>
                </span>
                <span className="text-xs text-text-secondary leading-relaxed">{body}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Tampilan & Privasi */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Tampilan & Privasi</h2>
        <div className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl">
          <div className="setting-row">
            <PrivacyToggle />
            <div>
              <p className="font-medium">Sembunyikan nominal (Mode Privasi)</p>
              <p className="text-xs text-text-secondary">Nominal disamarkan menjadi Rp •••••• agar aman di tempat umum.</p>
            </div>
          </div>
          <div className="setting-row">
            <ThemeToggle />
            <div>
              <p className="font-medium">Tema aplikasi</p>
              <p className="text-xs text-text-secondary">Beralih antara mode gelap (default) dan mode terang.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Keamanan Aplikasi */}
      <AppLockSettings />

      {/* 4. Aplikasi & Ekspor Data */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Aplikasi & Ekspor Data</h2>
        <div className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl">
          {appRows.map(({ href, Icon, title, body }) => (
            <Link key={href} href={href} className="setting-row group">
              <span className="icon-tile">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block font-medium text-text-primary">{title}</b>
                <span className="text-xs text-text-secondary">{body}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
          {exportRows.map(({ href, Icon, title, body }) => (
            <a key={href} href={href} download className="setting-row group">
              <span className="icon-tile">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block font-medium text-text-primary">{title}</b>
                <span className="text-xs text-text-secondary">{body}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-text-secondary" aria-hidden />
            </a>
          ))}
        </div>
      </section>

      {/* 5. Dokumen Legal */}
      <section className="mb-8">
        <h2 className="section-title mb-3">Dokumen</h2>
        <div className="surface-card divide-y divide-border-inner overflow-hidden rounded-3xl">
          {legalRows.map(({ href, Icon, title }) => (
            <Link key={href} href={href} className="setting-row group">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <span className="flex-1 font-medium text-text-primary text-sm">{title}</span>
              <ChevronRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Ubah Password */}
      <section className="surface-card mb-6 rounded-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="icon-tile">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-text-primary">Ubah Password</h2>
            <p className="text-xs text-text-secondary">Sesi lama akan otomatis dikeluarkan.</p>
          </div>
        </div>
        <ChangePasswordForm />
      </section>

      {/* 7. Zona Berbahaya */}
      <section className="mb-6 rounded-3xl border border-danger/30 bg-danger/5 p-5 sm:p-6">
        <h2 className="font-semibold text-danger">Zona Berbahaya</h2>
        <p className="mt-1 text-xs leading-5 text-text-secondary">
          Export data terlebih dahulu jika diperlukan. Penghapusan akun bersifat permanen dan tidak dapat dibatalkan.
        </p>
        <DeleteAccountForm />
      </section>

      {/* Logout button */}
      <div className="pt-2 pb-6 flex justify-center">
        <LogoutButton />
      </div>
    </main>
  )
}
