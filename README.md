# KASDESK

Aplikasi keuangan pribadi (PWA, Next.js) — catat pengeluaran, kelola dompet, tabungan, dan utang. Data di TiDB Cloud (MySQL-compatible).

## Fitur

- **Pencatatan cepat** — FAB → bottom sheet → transaksi dalam 2 ketukan; pemindai struk via Gemini (OCR) dengan konfirmasi otomatis
- **Dompet** — multiple wallet (cash/bank/e-wallet/investasi), transfer antar dompet, arsip & pulihkan
- **Tabungan (Vault)** — target nominal + tanggal, alokasi dari dompet, progress bar; dana vault tidak dihitung dalam "Aman Harian"
- **Utang & Piutang** — catat utang/piutang, bayar penuh atau **sebagian**, jatuh tempo
- **Insight** — aman harian (PRD §6.7), grafik 7 hari, kategori terbesar bulan ini
- **Offline** — log transaksi saat offline → antrean IndexedDB → sinkron otomatis saat koneksi kembali
- **PWA** — installable, offline shell, tema gelap

## Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js (App Router), React, Tailwind CSS v4 |
| Backend | Server Actions, Route Handlers |
| DB | TiDB Cloud (MySQL 8) via Drizzle ORM |
| Auth | Auth.js v5 (email+password, Google OAuth opsional) |
| OCR | Google Gemini API (`gemini-2.5-flash`) |

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi kredensial Anda
npm run db:push              # migrasi skema
npm run seed:demo            # data contoh (opsional)
npm run dev                  # http://localhost:3000 (sesuaikan AUTH_URL)
```

Produksi: `npm run build && npm start -p 3333`

### Konfigurasi env (`.env.local`, jangan commit)

| Variabel | Keperluan |
|---|---|
| `DATABASE_HOST/PORT/USER/PASSWORD/NAME` | TiDB Cloud |
| `AUTH_SECRET` | Auth.js — `openssl rand -base64 32` |
| `AUTH_URL` | Harus sama dengan port server yang berjalan |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth — kosongkan untuk nonaktif |
| `GEMINI_API_KEY` | OCR struk — kosong = OCR nonaktif (fail-closed) |

## Pengujian

```bash
# butuh server jalan: npx next start -p 3333 (kecuali unit)
# jalankan semua suite satu per satu (lihat daftar di bawah)
```

Semua suite: `test:smoke`, `test:isolation`, `test:debts`, `test:debt-partial`, `test:vaults`, `test:delete`, `test:transfer`, `test:ocr`, `test:ocr:limits`, `test:balance`, `test:balance:e2e`, `test:concurrency`, `test:ratelimit`, `test:register`, `test:register:atomic`, `test:register:unit`, `test:google-flag`, `test:dashboard`, `test:insights`, `test:archived`, `test:archived:unit`, `test:archived:coverage`, `test:wallet-archive`, `test:input-bounds`, `test:key-transport`, `test:security-headers`, `test:logout`, `test:offline`, `test:newuser-seed`, `test:cleanup`, `test:cleanup:fixtures`

> Catatan: `test:ocr-real` butuh `GEMINI_API_KEY` + kuota. Skema kredensial: `.env.local` (gitignored) satu-satunya tempat nilai asli; `.env.example` hanya placeholder.

## Keamanan

- Kredensial hanya di `.env.local` (gitignored)
- Rate limit login/registrasi/OCR
- Penolakan transaksi terhadap dompet terarsip di semua jalur uang
- Header keamanan (nosniff, X-Frame-Options, Referrer-Policy, CSP report-only)
- Kunci Gemini via header `x-goog-api-key`, bukan query string