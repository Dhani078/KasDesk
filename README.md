<div align="center">

# 💎 KASDESK
### *Personal Finance & Wealth Tracking, Elevated.*

PWA Keuangan Pribadi modern, super cepat, siap offline, dan aman.  
Dirancang *mobile-first* untuk mencatat transaksi dalam 2 ketukan, mengamankan data dengan PIN & Biometrik, serta memandu keputusan finansial harian Anda.

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TiDB Cloud](https://img.shields.io/badge/TiDB-MySQL_8-f02c5a?style=for-the-badge&logo=mysql)](https://tidbcloud.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa)](https://kas-desk.vercel.app/install)
[![CI Quality](https://img.shields.io/github/actions/workflow/status/Dhani078/KasDesk/ci.yml?branch=main&label=CI%20Checks&style=for-the-badge)](https://github.com/Dhani078/KasDesk/actions)

🌐 **Live Demo:** [kas-desk.vercel.app](https://kas-desk.vercel.app)

---

</div>

## ✨ Mengapa KASDESK?

| Fitur Unggulan | Manfaat Utama |
| :--- | :--- |
| ⚡ **QuickLog 2-Tap** | Catat pengeluaran harian dalam 2 ketukan via Bottom Sheet & chip kategori pintar. |
| 🔐 **Kunci PIN & Biometrik** | Perlindungan layar penuh dengan PIN 4-digit atau FaceID / Sidik Jari (WebAuthn). |
| 🤖 **AI Scan Struk (OCR)** | Foto struk belanjaan, Gemini AI otomatis mendeteksi nominal & tanggal transaksi. |
| 🛡️ **Aman Harian & Health Score** | Menghitung sisa uang yang aman dibelanjakan hari ini agar tidak boncos sebelum gajian. |
| 🎯 **Target Tabungan (Vault)** | Tabungan target dengan proyeksi waktu real-time yang terpisah dari uang belanja. |
| 🤝 **Utang & Piutang** | Pantau kewajiban aktif lengkap dengan pembayaran penuh maupun cicilan bertahap. |
| 📶 **100% Offline-First** | Transaksi diantrekan secara lokal via IndexedDB saat sinyal hilang dan otomatis sinkron saat online. |
| 📑 **Export CSV & JSON** | Unduh laporan transaksi siap buka di Excel/Google Sheets atau export seluruh akun. |

---

## 📸 Antarmuka & Alur Kerja

```
[ Beranda / Dashboard ]
   ├── 💰 Total Saldo (Multi-Dompet: Cash, Bank, E-Wallet)
   ├── 🛡️ Skor Kesehatan Finansial & Tips Cerdas
   ├── 🎯 Aman Harian (Batas belanja aman hari ini)
   └── ⚡ Tombol (+) QuickLog Sheet
         └── 🤖 Scan Struk Kamera / Galeri

[ Navigasi Utama ]
   ├── 💳 Dompet    → Kelola saldo tiap akun, transfer antar-dompet, arsip
   ├── 🎯 Target    → Tabungan tujuan (Vault) dengan auto-proyeksi waktu
   ├── 🏛️ Utang     → Catatan utang & piutang aktif + cicilan
   ├── 📊 Laporan   → Grafik 7 hari, kategori terbesar, tren mingguan
   └── ⚙️ Pengaturan→ Kunci PIN, Mode Privasi, Ganti Tema, Export Data
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Prasyarat
- Node.js 20+ atau 22+
- Akun TiDB Cloud (atau database MySQL lokal)

### 2. Kloning & Instalasi
```bash
# Klon repositori
git clone https://github.com/Dhani078/KasDesk.git
cd KasDesk

# Instal dependensi
npm install
```

### 3. Konfigurasi Lingkungan (`.env.local`)
Salin template konfigurasi dan masukkan kredensial database Anda:
```bash
cp .env.example .env.local
```

Isi variabel penting di `.env.local`:
```env
# Database (TiDB Cloud / MySQL)
DATABASE_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DATABASE_PORT=4000
DATABASE_USER=your_user.root
DATABASE_PASSWORD=your_password
DATABASE_NAME=kasdesk

# Auth.js Keamanan Sesi
AUTH_SECRET=rahasia-32-karakter-acak-anda
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Google Gemini API (Opsional untuk fitur Scan Struk)
GEMINI_API_KEY=AIzaSy...
```

### 4. Sinkronisasi Skema Database & Jalankan
```bash
# Migrasi tabel ke database
npm run db:push

# (Opsional) Isi data contoh untuk pengujian
npm run seed:demo

# Jalankan server pengembangan
npm run dev
```
Buka **[http://localhost:3000](http://localhost:3000)** di browser Anda! 🚀

---

## 🛠️ Tech Stack & Arsitektur

<details>
<summary><b>🔍 Klik untuk melihat rincian teknologi yang digunakan</b></summary>

<br>

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) dengan Webpack & Turbopack support.
* **Bahasa**: [TypeScript 5](https://www.typescriptlang.org/) dengan *strict mode* penuh.
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) dengan CSS Variables adaptif (Dark/Light).
* **Database & ORM**: [TiDB Cloud (MySQL)](https://tidbcloud.com/) + [Drizzle ORM](https://orm.drizzle.team/) untuk query tipe aman.
* **Autentikasi**: [Auth.js (NextAuth v5)](https://authjs.dev/) dengan proteksi CSRF, password hashing, dan rate limiting.
* **Keamanan Tambahan**:
  * PIN Hashing via Web Crypto API (`SHA-256` + unik salt acak).
  * WebAuthn Biometric API (TouchID, FaceID, Windows Hello).
* **AI Vision**: [Google Gemini 2.5 Flash](https://ai.google.dev/) untuk ekstraksi cepat data nota belanja.
* **PWA Engine**: Service Worker berbasis Workbox dengan caching cerdas dan antrean mutasi offline.

</details>

---

## 🧪 Pengujian & Kualitas Kode

KASDESK dilengkapi dengan pengujian unit dan otomatisasi terintegrasi:

```bash
# Menjalankan seluruh Unit Tests
npm run test:unit

# Pengecekan Type Safety TypeScript
npm run typecheck

# Pengecekan Standar Kode Linter
npm run lint

# Verifikasi Keamanan Dependensi
npm audit --omit=dev --audit-level=high

# Build Bundle Produksi
npm run build
```

---

## 📂 Struktur Direktori Proyek

```
KasDesk/
├── app/                  # Rute Next.js App Router
│   ├── (dashboard)/      # Halaman terautentikasi (Home, Wallets, Insights, dll.)
│   ├── (public)/         # Halaman publik (Welcome, Login, Register, Terms)
│   ├── api/              # API Endpoints (Health, OCR Scan, Export, Auth)
│   └── globals.css       # Token warna tema & utility CSS
├── components/           # Komponen UI Reusable (AppLock, BottomNav, Feed, dll.)
├── lib/                  # Logika Bisnis & Helper
│   ├── db/               # Skema Drizzle ORM & konfigurasi pool database
│   ├── auth/             # Sesi, validasi rate limit, dan password hashing
│   ├── analytics/        # Kalkulasi Skor Kesehatan, Aman Harian, dan Ringkasan
│   ├── offline/          # Antrean sinkronisasi IndexedDB saat offline
│   └── app-lock.ts       # Logika kriptografi kunci PIN & biometrik
├── public/               # Aset statis PWA (Icons, Manifest, Robots, Service Worker)
└── scripts/              # Skrip pengujian otomatis, migrasi, dan validasi rilis
```

---

## 🔒 Privasi & Keamanan Data

- **Data Terisolasi**: Setiap data transaksi dan saldo selalu terkunci menggunakan `userId` pengguna yang aktif.
- **Kerahasiaan Kredensial**: Database password dan auth secrets tidak pernah diunggah ke Git.
- **Enkripsi Sesi**: Token JWT dan cookie sesi diproteksi dengan `httpOnly` dan enkripsi TLS.
- **Hapus Akun**: Pengguna memiliki kendali penuh untuk menghapus akun secara permanen beserta seluruh mutasi datanya.

---

<div align="center">

Dibuat dengan ❤️ untuk kemudahan pengelolaan finansial yang lebih sehat.  
**KASDESK** © 2026. All rights reserved.

</div>
