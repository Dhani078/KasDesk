# 📐 KASDESK EXPANSION TECHNICAL SPECIFICATION BLUEPRINT
### *Comprehensive Engineering Design for EPIC 8, EPIC 5.1, EPIC 1, and EPIC 6*

---

| **Metadata** | **Specification** |
| :--- | :--- |
| **Document ID** | `SPEC-2026-EXPANSION-01` |
| **Status** | **APPROVED FOR IMPLEMENTATION** |
| **Target Codebase** | KasDesk v2.0+ (Next.js 16 App Router, React 19, Tailwind v4, TiDB MySQL 8) |
| **Author** | Senior Full-Stack & Fintech Solutions Architect |
| **Related Documents** | [`PRD.md`](../PRD.md), [`CHANGELOG.md`](../CHANGELOG.md), [`README.md`](../README.md) |

---

## 1. EXECUTIVE ROADMAP OVERVIEW

Dokumen ini merupakan panduan implementasi teknis detail (*Technical Blueprint*) untuk modul-modul ekspansi yang direncanakan pada PRD v2.0/v3.0. Setiap modul dirancang dengan prinsip:
1. **Zero Secret Leakage & Zero Friction** (kecepatan respon < 50ms, antarmuka intuitif).
2. **Defensive Concurrency & Atomic Mutations** (transaksi multi-tabel selalu dilindungi blok `tx.transaction`).
3. **Modularity Strict Bounds** (< 300–500 LOC per file komponen/hook/utilitas).
4. **Deterministic Testing Gate** (setiap modul wajib memiliki test suite mandiri yang terhubung ke `npm run test:unit` atau `npm run test:full`).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    EXPANSION ENGINEERING IMPLEMENTATION MAP                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1. EPIC 8: Native PWA Superpowers & Hardware Integration                     │
│    ├── 8.1 Web Share Target API (Bagi struk WA/Galeri langsung ke OCR)       │
│    ├── 8.2 App Shortcuts Quick Actions (?action=quicklog, ?action=scan)      │
│    ├── 8.3 Tactile Haptic Vibration Engine (lib/haptics.ts)                  │
│    └── 8.4 Web Push Notifications VAPID (Tagihan H-3, Harian 20:00, Budget)  │
│                                                                              │
│ 2. EPIC 5.1: Digital Envelopes & Zero-Based Budgeting (ZBB 50/30/20)         │
│    ├── 5.1.1 Arsitektur Amplop KasDesk (Wajib 50%, Keinginan 30%, Nabung 20%)│
│    ├── 5.1.2 Mesin Alokasi Pendapatan & Tracking Burn Rate per Pos Kategori  │
│    ├── 5.1.3 Visual Envelope Cards & Meteran Sisa Alokasi                    │
│    └── 5.1.4 Interaktif Envelope Rebalancing & Emergency Buffer              │
│                                                                              │
│ 3. EPIC 1: Multi-Currency, Kurs Valas & Emas Net Worth Rollup                │
│    ├── 1.1 Migrasi Skema 0005 (wallets.currency, transactions.currency)     │
│    ├── 1.2 Pipeline Kurs Mata Uang (IDR, USD, SGD, EUR, JPY, XAU Emas Gram) │
│    ├── 1.3 Consolidated Net Worth Card & Ekuivalen Rupiah Terpadu            │
│    └── 1.4 Invarian Kurs Historis Transaksi (exchangeRateAtOccurred)         │
│                                                                              │
│ 4. EPIC 6: Shared Financial Spaces (Mode Rumah Tangga & Kas Pasutri)         │
│    ├── 4.1 Migrasi Skema 0008 (sharedSpaces, spaceMembers, spaceId)          │
│    ├── 4.2 Isolasi Dual-Ledger (Dompet Pribadi vs Kas Rumah Tangga)          │
│    ├── 4.3 Workspace Switcher di Header Navigasi                             │
│    └── 4.4 Multi-User Audit Trail & Rekam Jejak Pencatat Transaksi           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. EPIC 8: NATIVE PWA SUPERPOWERS & HARDWARE INTEGRATION

### 2.1 Web Share Target API (Bagi Struk dari Galeri/WhatsApp)
#### 2.1.1 Problem & Use Case
Pengguna sering menerima struk PDF dari transfer bank atau screenshot nota di WhatsApp. Alih-alih mengunduh manual, membuka KasDesk, membuka QuickLog, lalu memilih file dari galeri, pengguna cukup menekan tombol **"Bagikan / Share"** di WhatsApp atau Galeri foto, memilih icon **KasDesk**, dan aplikasi langsung terbuka dengan struk yang siap diproses oleh pipeline Gemini OCR.

#### 2.1.2 Manifest Configuration (`public/manifest.json`)
```json
{
  "share_target": {
    "action": "/share-target",
    "method": "POST",
    "enctype": "multipart/form-data",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url",
      "files": [
        {
          "name": "receipt",
          "accept": ["image/jpeg", "image/png", "image/webp", "application/pdf"]
        }
      ]
    }
  }
}
```

#### 2.1.3 Architecture & Data Flow
1. **Service Worker (`public/sw.js`)**:
   - Menangkap request `POST /share-target`.
   - Mengambil file dari `formData` dan menyimpannya sementara ke IndexedDB (`shared-receipts-cache`).
   - Melakukan navigasi klien ke rute `/?action=scan&shared=1`.
2. **Client Receiver (`components/HomeFeed.tsx` / `components/scanner/SharedReceiptBridge.tsx`)**:
   - Saat mendeteksi query `action=scan&shared=1`, komponen membaca gambar dari IndexedDB.
   - Membuka `QuickLogSheet` dalam mode OCR dan langsung mengeksekusi pipeline scanning.
   - Membersihkan item dari cache setelah proses selesai.

---

### 2.2 App Shortcuts & Quick Actions
#### 2.2.1 Shortcut Definitions
Pada menu long-press icon layar utama (Home Screen) di Android dan iOS PWA:
1. ⚡ **Catat Cepat**: URL `/?action=quicklog` $\rightarrow$ membuka QuickLog Sheet seketika dalam <50ms.
2. 📸 **Scan Struk**: URL `/?action=scan` $\rightarrow$ langsung memicu dialog kamera/OCR.
3. 📊 **Laporan Finansial**: URL `/insights` $\rightarrow$ membuka analitik bulanan.
4. 💳 **Dompet & Saldo**: URL `/wallets` $\rightarrow$ membuka daftar rekening.

#### 2.2.2 Client URL Listener
Tambahkan hook ringan `useAppShortcutsAction()` di komponen root dashboard yang mendengarkan `window.location.search`:
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  if (action === 'quicklog') {
    window.dispatchEvent(new CustomEvent('kasdesk:open-quicklog'));
  } else if (action === 'scan') {
    window.dispatchEvent(new CustomEvent('kasdesk:open-scan'));
  }
}, []);
```

---

### 2.3 Tactile Haptic Vibration Engine (`lib/haptics.ts`)
#### 2.3.1 Vibration Signatures
Untuk memberikan rasa responsif layaknya aplikasi native iOS/Android, getaran haptic dirancang dengan pola presisi:
- **`hapticTap()`**: `[10]` (10ms) — feedback klik tombol kalkulator atau kategori.
- **`hapticSuccess()`**: `[15, 40, 20]` — feedback transaksi berhasil dicatat atau budget tersimpan.
- **`hapticWarning()`**: `[30, 60, 30]` — feedback peringatan Safe-to-Spend atau budget mencapai 90%.
- **`hapticDelete()`**: `[40, 80, 50]` — feedback konfirmasi penghapusan data.
- **Safe Fallback**: Jika `navigator.vibrate` tidak didukung (misal di PC desktop atau Safari tanpa izin), fungsi tetap berjalan secara *no-op* tanpa error.

---

### 2.4 Web Push Notifications (VAPID)
#### 2.4.1 Subscription Architecture
- Database tabel `pushSubscriptions`:
  - `id` CHAR(36), `userId` CHAR(36), `endpoint` VARCHAR(500), `p256dh` VARCHAR(255), `auth` VARCHAR(255), `userAgent` VARCHAR(255).
- Generasi kunci VAPID (`web-push` standard):
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`.
- Tiga Jadwal Pemicu Notifikasi:
  1. **Pengingat Tagihan H-3 & H-1**: Mendeteksi jadwal di `recurringRules`.
  2. **Pengingat Catat Malam (20:00)**: Mengecek apakah ada pengeluaran hari ini. Jika belum ada, kirim push interaktif: *"Ada pengeluaran hari ini yang belum dicatat? Tap untuk 2-tap log!"*.
  3. **Peringatan Batas Budget (90% Threshold)**: Terpicu saat mutasi belanja mendorong total pengeluaran kategori melampaui 90% dari batas bulanan.

---

## 3. EPIC 5.1: DIGITAL ENVELOPES & ZERO-BASED BUDGETING (ZBB 50/30/20)

### 3.1 Konsep Zero-Based Budgeting (ZBB)
Prinsip utama ZBB: **Setiap rupiah dari pendapatan bulanan wajib diberi tugas hingga sisa alokasi menjadi Rp 0**:
$$\text{Total Pemasukan Bulanan} - (\text{Amplop Kebutuhan Pokok} + \text{Amplop Keinginan} + \text{Amplop Tabungan/Investasi}) = 0$$

### 3.2 Struktur Tiga Amplop Utama
```
[ PEMASUKAN BULANAN (100%) ]
  ├── 🏠 Amplop 1: Kebutuhan Pokok (Needs - 50%)
  │   ├── Pos: #MAKAN, #TRANSPORT, #TAGIHAN, #KESEHATAN, #PENDIDIKAN
  │   └── Sifat: Wajib, tidak bisa ditunda, menjaga kelangsungan hidup.
  │
  ├── 🎮 Amplop 2: Keinginan & Gaya Hidup (Wants - 30%)
  │   ├── Pos: #BELANJA, #HIBURAN, #KULINER_CAFE, #GAYA_HIDUP
  │   └── Sifat: Fleksibel, dapat dipotong seketika saat arus kas kritis.
  │
  └── 💎 Amplop 3: Tabungan & Investasi (Savings & Debt - 20%)
      ├── Pos: #TABUNGAN_VAULT, #DANA_DARURAT, #CICILAN_UTANG, #INVESTASI
      └── Sifat: Menjamin kebebasan finansial jangka panjang (Pay Yourself First).
```

### 3.3 Dynamic Balance Burning Engine
Setiap kali transaksi baru dicatat:
1. Sistem mencocokkan `categoryTag` dengan kelompok amplop.
2. Saldo amplop berkurang secara *real-time*:
   $$\text{Sisa Saldo Amplop} = \text{Alokasi Amplop} - \sum \text{Pengeluaran Kategori Terkait Bulan Ini}$$
3. Jika pengeluaran pada amplop melebihi batas, status kartu berubah menjadi `Overallocated` (merah) dan menampilkan rekomendasi rebalancing otomatis dari Amplop Keinginan ke Amplop Kebutuhan.

### 3.4 Komponen Antarmuka (`components/planning/DigitalEnvelopesView.tsx`)
- **Header Summary Card**:
  - Total Pemasukan vs Total Teralokasi.
  - Badge Status: *"Teralokasi Sempurna (ZBB Rp 0)"* atau *"Ada Rp 450.000 Belum Diberi Tugas"*.
- **Tiga Kartu Amplop Interaktif**:
  - Progress bar visual gradien.
  - Nominal terpakai vs batas alokasi.
  - Tombol **Rebalance**: Memindahkan sisa amplop keinginan untuk menambal kelebihan belanja kebutuhan.

---

## 4. EPIC 1: MULTI-CURRENCY, FOREX, EMAS & CRYPTO NET WORTH ROLLUP

### 4.1 Database Migration `0005_multi_currency_and_rates.sql`
```sql
-- Tambah kolom currency pada wallets
ALTER TABLE `wallets`
  ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR' AFTER `type`;

-- Tambah kolom currency dan exchange rate pada transaksi historis
ALTER TABLE `transactions`
  ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR' AFTER `amount`,
  ADD COLUMN `exchangeRate` DECIMAL(18, 6) NOT NULL DEFAULT 1.000000 AFTER `currency`,
  ADD COLUMN `baseAmount` BIGINT NOT NULL DEFAULT 0 AFTER `exchangeRate`;

-- Tabel cache nilai tukar mata uang
CREATE TABLE IF NOT EXISTS `exchangeRates` (
  `id` CHAR(36) NOT NULL,
  `fromCurrency` VARCHAR(10) NOT NULL,
  `toCurrency` VARCHAR(10) NOT NULL DEFAULT 'IDR',
  `rate` DECIMAL(18, 6) NOT NULL,
  `provider` VARCHAR(32) NOT NULL DEFAULT 'system',
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchange_rates_pair_uq` (`fromCurrency`, `toCurrency`),
  KEY `exchange_rates_lookup_idx` (`fromCurrency`, `toCurrency`, `updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.2 Presisi & Format Desimal Adaptif
| Tipe Aset | Simbol | Presisi Desimal | Contoh Format |
| :--- | :--- | :--- | :--- |
| **IDR** (Rupiah) | `Rp` | 0 desimal | `Rp 15.000.000` |
| **USD** (Dollar AS) | `$` | 2 desimal | `$ 1,250.50` |
| **SGD** (Dollar Singapura) | `S$` | 2 desimal | `S$ 850.00` |
| **EUR** (Euro) | `€` | 2 desimal | `€ 420.75` |
| **JPY** (Yen Jepang) | `¥` | 0 desimal | `¥ 35,000` |
| **MYR** (Ringgit Malaysia) | `RM` | 2 desimal | `RM 210.00` |
| **XAU** (Emas Antam Gram) | `g` | 3 desimal | `12.500 gram` (ekuivalen Rp 17.500.000) |
| **USDT / Crypto** | `₮ / BTC` | 2 - 6 desimal | `0.045000 BTC` |

### 4.3 Invarian Kurs Historis (`exchangeRateAtOccurred`)
Agar grafik pengeluaran masa lalu tidak mengalami fluktuasi akibat naik-turunnya kurs dolar atau emas di masa sekarang:
- Saat transaksi valas dibuat, nilai tukar saat transaksi terjadi dibekukan di kolom `exchangeRate` dan `baseAmount = round(amount * exchangeRate)`.
- Semua analitik historis menghitung `baseAmount` dalam Rupiah tetap.

---

## 5. EPIC 6: SHARED FINANCIAL SPACES (MODE RUMAH TANGGA & PASUTRI)

### 5.1 Dual-Ledger Architecture
Setiap pengguna memiliki akun pribadi, namun dapat membuat atau bergabung ke satu atau lebih **Shared Space** (misal: "Rumah Tangga Dhani & Sarah").
- **Dompet Pribadi**: `spaceId = NULL`. Hanya terlihat dan dapat diakses oleh pemilik akun.
- **Dompet Bersama**: `spaceId = '<uuid>'`. Dapat dilihat dan dimutasi oleh seluruh anggota terdaftar di `spaceMembers`.

### 5.2 Role-Based Access Control (RBAC)
- **`owner`**: Membuat ruang, mengundang/menghapus anggota, menghapus ruang, mengatur dompet bersama.
- **`editor`**: Mencatat pengeluaran/pemasukan bersama, melihat laporan, menambah pos budget.
- **`viewer`**: Hanya melihat mutasi dan laporan tanpa hak menambah atau mengedit transaksi.

### 5.3 Space Switcher (`components/navigation/SpaceSwitcher.tsx`)
Terletak di header atas sebelah profil:
```text
[ 👤 Dompet Pribadi (Rp 12.500.000) ]  ▼
   ├── 👤 Dompet Pribadi (Aktif)
   ├── 🏠 Kas Rumah Tangga (Rp 8.400.000)
   └── ➕ Buat Ruang Bersama Baru
```
Saat berganti ruang kerja, context React memperbarui filter query global sehingga seluruh feed transaksi, dompet, dan budget otomatis beralih ke data ruang bersama tanpa perlu login ulang.

---

## 6. DEFINITION OF DONE & QUALITY GATE

Sebelum setiap fitur dinyatakan siap produksi:
1. **0 TypeScript Errors**: `npx tsc --noEmit` lolos dengan kode keluar 0.
2. **0 ESLint Warnings**: `npm run lint` lolos dengan kode keluar 0.
3. **Automated Unit Tests**: Suite test baru terpasang di `scripts/test-*.js` dan terdaftar di `package.json`.
4. **Mobile Responsiveness**: Tidak ada pergeseran horizontal (*0 horizontal overflow*) pada resolusi 320px, 390px, dan 1280px.
5. **Atomic Commits**: Setiap commit harus ringkas, atomik, dan menggunakan format Conventional Commits (`feat(...)`, `ui(...)`, `test(...)`, `docs(...)`).
