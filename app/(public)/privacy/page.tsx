import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-static'

export default function PrivacyPage() {
  return (
    <main className="page-shell max-w-2xl">
      <Link href="/welcome" className="back-link">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali
      </Link>

      <header className="page-header">
        <div>
          <p className="eyebrow">Privasi</p>
          <h1>Kebijakan Privasi</h1>
          <p>Bagaimana KASDESK melindungi dan memperlakukan data keuangan Anda.</p>
        </div>
        <span className="icon-tile">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
      </header>

      <div className="surface-card space-y-5 rounded-3xl p-6 sm:p-8 text-sm leading-7 text-text-secondary">
        <div>
          <h2 className="font-semibold text-text-primary text-base">1. Penggunaan Data Akun & Transaksi</h2>
          <p className="mt-1">
            KASDESK memproses data akun (nama, email, password terenkripsi) dan catatan finansial (dompet, mutasi transaksi, target tabungan, utang-piutang) semata-mata untuk mengoperasikan fitur aplikasi. Kami tidak menjual data keuangan pengguna kepada pihak ketiga maupun pengiklan.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-text-primary text-base">2. Fitur AI (Scan Struk & AI Coach)</h2>
          <p className="mt-1">
            Jika fitur pemindaian struk (OCR) atau konsultasi AI Coach digunakan, teks dan gambar yang relevan diproses melalui Google Gemini API secara aman via komunikasi terenkripsi (TLS). Data tersebut tidak disimpan untuk pelatihan model publik.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-text-primary text-base">3. Hak Akses & Ekspor Data</h2>
          <p className="mt-1">
            Pengguna memiliki hak penuh untuk mengekspor seluruh rekapan transaksi (format CSV atau JSON lengkap) kapan saja, serta menghapus akun secara permanen melalui menu Pengaturan.
          </p>
        </div>
      </div>
    </main>
  )
}
