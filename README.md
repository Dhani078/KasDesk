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
| 🎨 **Custom SVG Geometric Brandmark** | Logo vektor presisi tinggi (`components/KasDeskLogo.tsx`) bertema heksagonal *vault-shield* bercahaya neon elektrik & tipografi modern. |
| ⚡ **QuickLog 2-Tap** | Catat pengeluaran harian dalam 2 ketukan via Bottom Sheet & chip kategori pintar. |
| 🧮 **Kalkulator di Kolom Nominal** | Hitung matematika langsung di input (`15000+5000` = `20.000`) dengan operator instan & live preview. |
| 💬 **AI Coach Chat & Floating Bubble (FAB)** | Asisten finansial melayang di seluruh halaman (`FloatingCoachBubble.tsx`), catat transaksi percakapan otomatis (*"makan 18rb"*), dan guardrail ketat anti-coding. |
| 🤖 **AI Scan Struk (OCR)** | Foto struk belanjaan, Gemini 3.8 Flash otomatis mendeteksi nominal & tanggal transaksi. *Fallback cascade* otomatis ke 3.7 / 3.6 / 3.5 / 2.5 Flash. |
| 📷 **AI Scan Saldo Screenshot Bank** | Ekstraksi saldo rekening langsung dari tangkapan layar m-Banking (BCA, Mandiri, SeaBank, GoPay, DANA) & auto-reconcile `#PENYESUAIAN`. |
| 📥 **Bank Statement & Mutasi Importer (EPIC 4)** | Urai mutasi CSV/Teks (BCA KlikBCA, Mandiri Livin, SeaBank, BRImo, SMS) dengan SHA-256 deduplikasi & batch commit atomik. |
| 🪙 **Micro-Savings "Celengan Pembulatan" (EPIC 5)** | Otomatisasi pembulatan receh belanja (ke Rp 1.000 / Rp 5.000 / Rp 10.000) langsung ke Vault target secara atomik & dialog *Pay Yourself First* alokasi gaji. |
| 🌍 **Multi-Currency & Net Worth Rollup (EPIC 1)** | Dukungan 10 mata uang/aset (IDR, USD, SGD, EUR, JPY, MYR, Emas Antam XAU, USDT, BTC, ETH) dengan kartu konsolidasi kekayaan bersih (*Net Worth Card*). |
| ✉️ **Amplop Digital ZBB 50/30/20 (EPIC 5.1)** | Zero-Based Budgeting dengan pelacakan real-time burn rate Kebutuhan (50%), Keinginan (30%), dan Tabungan (20%). |
| 🏠 **Shared Spaces Mode Rumah Tangga (EPIC 6)** | Dual-ledger keuangan bersama pasangan/rekan kost dengan pemisahan dompet pribadi, hak akses RBAC (owner, editor, viewer), dan jejak audit pencatat. |
| 👥 **Smart Split-Bill & WhatsApp Settlement (EPIC 2)** | Bagi tagihan pesanan per orang, distribusi proporsional pajak PB1/Service, zero-difference rounding, dan tautan WA otomatis. |
| 📈 **Proyeksi Arus Kas & Tanggal Kritis (EPIC 3)** | Simulasi kurva saldo harian 30/60/90 hari dengan deteksi tanggal kritis, overdraft warning, dan simulator pengeluaran dadakan (What-If Shock). |
| 🛡️ **Meteran Runway Kas & Dana Darurat** | Ukur daya tahan likuiditas kas (Survival Index dalam bulan/hari) terhadap monthly burn rate aktual. |
| 💼 **Kalkulator Pajak Freelancer PPh 21** | Simulasi pajak tahunan dan tabungan bulanan mandiri norma NPPN 50% & tarif progresif UU HPP Pasal 17 (TK/0 s/d K/3). |
| 🔒 **Cadangan Terenkripsi Zero-Knowledge (EPIC 9)** | Ekspor `.kasdesk.enc` berstandar militer (AES-256-GCM + PBKDF2 100k iterasi), passphrase tidak pernah terkirim ke server. |
| 🤖 **Arsitektur Dual-Mode (Manual + AI Copilot)** | Setiap modul dilengkapi aksi manual & asisten AI: Budget 50/30/20, Simulasi Kelayakan Target Tabungan, dan AI Draf Pengingat Piutang WA. |
| 🔐 **Kunci PIN & Biometrik** | Perlindungan layar penuh dengan PIN 6-digit atau FaceID / Sidik Jari (WebAuthn). |
| 🔄 **Pengingat Langganan Rutin** | Pantau tagihan/langganan berkala dengan badge hitung mundur (*H-3*) dan tombol **Catat Sekarang** 1-klik. |
| 🏷️ **Multi-Tag & Filter Label** | Kelompokkan mutasi dengan tag `#Liburan`, `#Kondangan`, `#Proyek` dan pantau total pengeluaran per-event. |
| 📄 **Rekap Bulanan & WhatsApp Share** | Buat ringkasan bulanan estetik, bagikan 1-klik ke WhatsApp atau cetak / simpan ke PDF. |
| 🏆 **Gamifikasi Health Score** | Tingkatkan level kesehatan finansialmu dari *Bronze*, *Silver*, *Gold*, hingga *Diamond Tier*. |
| ⌨️ **Keyboard Shortcut Desktop** | `c` catat cepat, `/` cari transaksi, `p` mode privasi, `?` daftar shortcut. |
| 📶 **100% Offline-First** | Transaksi diantrekan secara lokal via IndexedDB saat sinyal hilang dan otomatis sinkron saat online. |
| 🗺️ **Master PRD v2.0/v3.0** | Cetak biru lengkap 9 Epic arsitektur masa depan untuk Claude/Opus/Hermes di [`PRD.md`](./PRD.md). |
| 📐 **Technical Blueprint** | Spesifikasi teknis & rancangan rekayasa mendalam di [`docs/ROADMAP-EXPANSION-SPECS.md`](./docs/ROADMAP-EXPANSION-SPECS.md). |

---

## 📸 Antarmuka & Alur Kerja

```
[ Beranda / Dashboard ]
   ├── 💰 Total Saldo (Multi-Dompet: Cash, Bank, E-Wallet)
   ├── 🏆 Gamifikasi Financial Health (Diamond 💎 / Gold 🥇 / Silver 🥈 / Bronze 🥉)
   ├── 🎯 Aman Harian (Batas belanja aman hari ini)
   ├── ⚡ Tombol (+) QuickLog Sheet
   │     ├── 🧮 Inline Calculator (+, −, ×, ÷, =)
   │     ├── 🏷️ Tag Cepat (#Liburan, #Proyek, dll.)
   │     └── 🤖 Scan Struk Kamera / Galeri via Gemini OCR
   └── 🔄 Notifikasi Tagihan Rutin Mendekati Jatuh Tempo

[ Navigasi Utama ]
   ├── 💳 Dompet    → Kelola saldo tiap akun, transfer antar-dompet, arsip
   ├── 🎯 Target    → Tabungan tujuan (Vault) dengan auto-proyeksi waktu
   ├── 🏛️ Utang     → Catatan utang & piutang aktif + cicilan
   ├── 📊 Laporan   → Grafik 7 hari, kategori terbesar, tren, & Rekap WhatsApp/PDF
   ├── 📅 Rencana   → Budget bulanan, Pengingat Langganan & tombol Catat 1-Klik
   └── ⚙️ Pengaturan→ Kunci PIN 6-digit, Biometrik, Mode Privasi, Ganti Tema
```

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Prasyarat
- Node.js 22+ (sesuai `PROMPT-ANTIGRAVITY.md` Tahap 1)
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

# Timezone perhitungan bulan (default Asia/Makassar / UTC+8)
APP_TIME_ZONE=Asia/Makassar
```

### 4. Sinkronisasi Skema Database & Jalankan
```bash
# Migrasi tabel ke database
npm run db:push

# (Opsional) Isi data contoh untuk pengujian
npm run seed:demo

# Jalankan server pengembangan (port 3000 default, atau port 3333 untuk test suite)
npm run dev
# atau: npm run dev -- -p 3333
```
Buka **[http://localhost:3000](http://localhost:3000)** (atau port 3333 jika menggunakan `-p 3333`) di browser Anda! 🚀

---

## 🛠️ Tech Stack & Arsitektur

<details>
<summary><b>🔍 Klik untuk melihat rincian teknologi yang digunakan</b></summary>

<br>

* **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) dengan Webpack & Turbopack support.
* **Bahasa**: [TypeScript 5](https://www.typescriptlang.org/) dengan *strict mode* penuh.
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) dengan CSS Variables adaptif (Dark/Light) & `@media print` layout.
* **Database & ORM**: [TiDB Cloud (MySQL)](https://tidbcloud.com/) + [Drizzle ORM](https://orm.drizzle.team/) untuk query tipe aman.
* **Autentikasi**: [Auth.js (NextAuth v5)](https://authjs.dev/) dengan proteksi CSRF, password hashing, dan rate limiting.
* **Keamanan Tambahan**:
  * PIN Hashing via Web Crypto API (`SHA-256` + unik salt acak).
  * WebAuthn Biometric API (TouchID, FaceID, Windows Hello).
* **Fitur Cerdas**:
  * Parser Aritmatika Aman (`lib/calculator.ts`) tanpa `eval()` berbahaya.
  * Parser Tag Multibahasa (`lib/tags.ts`) dengan ekstraksi regex Unicode.
  * Generator Ringkasan WhatsApp & PDF Print View (`components/MonthlyRecapModal.tsx`).
* **AI Vision**: [Google Gemini 3.8 Flash](https://ai.google.dev/) untuk ekstraksi cepat data nota belanja, dengan *fallback cascade* otomatis ke Gemini 3.7 Flash dan 3.6 Flash saat server Google antre (503/429).
* **PWA Engine**: Service Worker berbasis Workbox dengan caching cerdas dan antrean mutasi offline.

</details>

---

## 🧪 Pengujian & Kualitas Kode

KASDESK dilengkapi dengan pengujian unit dan otomatisasi terintegrasi:

```bash
# Verifikasi Lengkap 1 Perintah (Full Gate)
# = typecheck + lint + 271 unit checks + AI Coach cascade + cursor pagination
#   + 70 browser audit (CDP) + 23 DB integration suites + release validation
npm run test:full

# Menjalankan seluruh 271 Unit Tests (offline & deterministik)
npm run test:unit

# Test spesifik per modul inovasi:
npm run test:web-push         # Web Push Notifications (VAPID) & Web Share Target
npm run test:shared-spaces     # Mode Rumah Tangga & RBAC Dual-Ledger
npm run test:multi-currency    # Mesin Multi-Currency, Kurs & Net Worth Rollup
npm run test:digital-envelopes # Amplop Digital ZBB 50/30/20 & Dynamic Burn Rate
npm run test:micro-savings     # Algoritma Celengan Pembulatan & Pay Yourself First
npm run test:tax               # Kalkulator PPh 21 Freelancer NPPN 50%
npm run test:split-bill         # Algoritma Smart Split-Bill & PB1 Proportional
npm run test:encrypted-backup   # AES-256-GCM + PBKDF2 100k Zero-Knowledge Backup
npm run test:forecast           # Proyeksi Arus Kas Prediktif & What-If Simulator
npm run test:balance-sync       # Rekonsiliasi Saldo Screenshot Bank Atomik
npm run test:nlp                # NLP Conversational Transaction Parser & Guardrails
npm run test:dual-mode-ai       # Dual-Mode AI Copilots (Budget, Vault, Debt WA)
npm run test:statement          # Multi-Bank Statement CSV/Text Importer Engine

# Audit Browser Headless Chrome CDP nyata (320px / 390px / 1280px, 0 horizontal overflow)
npm run test:browser

# 23 Database Integration Suites (TiDB Cloud): isolasi, saldo, transfer, utang, vault, balance-sync
npm run test:db

# Pengecekan Type Safety TypeScript
npm run typecheck

# Pengecekan Standar Kode Linter
npm run lint

# Verifikasi Lengkap (Typecheck + Lint + Build)
npm run check

# Validasi Rilis (secret leakage check, PWA manifest, environment)
npm run release:check

# Verifikasi Keamanan Dependensi
npm audit --omit=dev --audit-level=high
```

---

## 📂 Struktur Direktori Proyek

```
KasDesk/
├── PRD.md                # Spesifikasi Lengkap & Arsitektur v2.0/v3.0 untuk Agen AI
├── app/                  # Rute Next.js App Router (Dashboard, Public, API)
├── components/           # Komponen UI Reusable
│   ├── navigation/       # SpaceSwitcher (Mode Rumah Tangga) & BottomNav
│   ├── planning/         # DigitalEnvelopesCard (ZBB 50/30/20) & AiBudgetModal
│   ├── vaults/           # RoundUpSettingsModal, VaultSheets, AiVaultPlanner
│   ├── debts/            # DebtRow, NewDebtSheet, AiDebtReminderModal
│   ├── wallets/          # NetWorthCard (10 Aset Valas/Emas/Kripto), SyncWalletModal
│   ├── quicklog/         # Sub-komponen modular QuickLog, kalkulator, dan chip
│   ├── coach/            # FloatingCoachBubble, AI Coach Chat, TaxEstimator
│   ├── importer/         # StatementImportModal (BCA/Mandiri/SeaBank/CSV)
│   └── splitbill/        # Smart Split-Bill & Settlement Modal
├── lib/                  # Logika Bisnis & Domain Modules
│   ├── actions/          # Modular Server Actions (transactions, wallets, vaults, debts)
│   ├── currency.ts       # Multi-Currency, Forex, Emas & Net Worth Engine
│   ├── planning/         # Digital Envelopes ZBB 50/30/20 Engine
│   ├── spaces.ts         # Shared Financial Spaces & RBAC Engine
│   ├── micro-savings.ts  # Celengan Pembulatan & Pay Yourself First Engine
│   ├── haptics.ts        # Tactile Haptic Vibration Engine PWA
│   ├── push/             # Web Push Notifications RFC 8292 & VAPID Engine
│   ├── scanner/          # Web Share Target & OCR Bridge
│   ├── crypto/           # AES-256-GCM + PBKDF2 Zero-Knowledge Encrypted Backup
│   └── db/               # Skema Drizzle ORM (TiDB MySQL 8)
├── drizzle/              # Migrasi SQL (0000_init s/d 0007_push_subscriptions)
├── public/               # Aset statis PWA (Icons, Manifest, Service Worker)
└── scripts/              # 17 Unit Test Suites (271 Checks) & Database Integration Runners
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
