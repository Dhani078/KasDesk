import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'

export const dynamic = 'force-static'

export default function TermsPage() {
  return (
    <main className="page-shell max-w-2xl">
      <Link href="/welcome" className="back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali
      </Link>

      <header className="page-header">
        <div>
          <p className="eyebrow">Syarat & Ketentuan</p>
          <h1>Ketentuan Layanan</h1>
          <p>Syarat dan batasan penggunaan aplikasi pencatatan keuangan KASDESK.</p>
        </div>
        <span className="icon-tile">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
      </header>

      <div className="surface-card space-y-5 rounded-3xl p-6 sm:p-8 text-sm leading-7 text-text-secondary">
        <div>
          <h2 className="font-semibold text-text-primary text-base">1. Sifat Layanan</h2>
          <p className="mt-1">
            KASDESK adalah alat bantu pencatatan keuangan pribadi mandiri, bukan lembaga perbankan, penyedia pinjaman, atau penasihat investasi berlisensi. Segala kalkulasi (seperti Aman Harian dan Proyeksi Tabungan) bersifat estimasi analitis untuk mempermudah perencanaan Anda.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-text-primary text-base">2. Keamanan & Tanggung Jawab Akun</h2>
          <p className="mt-1">
            Pengguna bertanggung jawab penuh atas kerahasiaan password dan PIN perangkat. Kami menganjurkan penggunaan PIN & Biometrik serta pengaktifan Mode Privasi saat mengakses aplikasi di area publik.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-text-primary text-base">3. Pemindaian AI & Verifikasi</h2>
          <p className="mt-1">
            Hasil pembacaan otomatis struk oleh AI (OCR) dan saran AI Coach ditujukan sebagai bantuan asistensi. Pengguna diimbau memeriksa kembali nominal angka sebelum menyimpan transaksi ke dompet.
          </p>
        </div>
      </div>
    </main>
  )
}
