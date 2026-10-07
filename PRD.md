# 💎 KASDESK v2.0 & v3.0 PRODUCT REQUIREMENT DOCUMENT (PRD)
### *Next-Generation Personal Finance, Multi-Currency Wealth OS & Financial Autopilot*

---

| **Metadata** | **Specification** |
| :--- | :--- |
| **Document Version** | `2.0.0-PROD-SPEC` |
| **Status** | **APPROVED FOR IMPLEMENTATION** |
| **Author** | Senior Full-Stack & Fintech Solutions Architect |
| **Target Execution Agents** | Claude 3.7 / Opus / Antigravity / Autonomous Coding Subagents |
| **Active Baseline** | KasDesk v0.1.0 (Next.js 16.3.5 App Router, React 19.2.8, Tailwind CSS v4, TiDB Cloud, Drizzle ORM, Auth.js v5 beta, Gemini 3.8/3.7/3.6 Flash cascade) |
| **Repository Path** | `C:\xampp\htdocs\KasDesk` |
| **Deployment Target** | Vercel (Edge/Serverless) + TiDB Cloud Serverless (MySQL 8 compatible) |
| **Target Timezone** | `Asia/Makassar` (UTC+8) default, configurable per user |
| **Primary Currency** | `IDR` (Rupiah Indonesia) with multi-currency rollup |

---

## 1. EXECUTIVE VISION & STRATEGIC OBJECTIVES

### 1.1 Mission Statement
**KasDesk** bertransformasi dari sekadar PWA pencatat pengeluaran harian menjadi **Personal Wealth Operating System & Financial Autopilot** paling responsif, aman, dan cerdas di Indonesia. Dirancang dengan prinsip **Zero Friction (2-Tap Logging)**, **Zero AI Slop (100% mathematically grounded)**, **Zero Secret Exposure**, dan **100% Offline-First**, KasDesk memberdayakan pengguna mulai dari mahasiswa, pekerja lepas (freelancer), keluarga muda, hingga pelaku UMKM untuk menguasai arus kas, memangkas kebocoran finansial, dan mencapai kemandirian finansial (*Financial Freedom*).

### 1.2 Core Pillars (Filosofi Desain 1000/1000)
1. **Zero Friction & Sub-50ms Interaction**:
   - Catat transaksi dalam maksimal 2 ketukan via QuickLog Sheet.
   - Inline arithmetic calculator tanpa modal tambahan (`15000+7500` langsung terhitung).
   - Optimistic UI updates seketika; sinkronisasi background via IndexedDB saat sinyal terputus.
2. **Absolute Data Integrity & Concurrency Safety**:
   - Tidak ada mutasi saldo tanpa atomic transaction (`tx.transaction`).
   - Idempotency mutlak menggunakan `clientMutationId` UUID v4 di seluruh mutasi.
   - Proteksi saldo negatif yang dapat dikonfigurasi per-dompet (*no overdraft leaks*).
3. **Actionable AI & Zero Hallucination**:
   - AI bukan sekadar chatbot kosmetik. AI Coach dan Gemini OCR Vision terhubung langsung dengan *live mathematical bounds* (anggaran riil, sisa Safe-to-Spend, dan histori transaksi).
   - Filter ketat terhadap reasoning thought-tokens Google Gemini Flash.
4. **Extreme Modularity & Clean Architecture**:
   - Batas ketat: **<300-500 LOC per file**. Setiap file yang mendekati ambang batas wajib dipecah menjadi modul independen (komponen, hooks, pure functions, dan types).
   - Real database schemas over mocks; 100% type-safe Drizzle ORM & Zod validation di trust boundary.
5. **Indonesian Context Native**:
   - Dukungan bawaan untuk QRIS settlement, pembagian pajak restoran PB1 (10-11%) & service charge (5-10%), bank transfer terpopuler (BCA, Mandiri, BRI, BNI), e-wallet (GoPay, OVO, ShopeePay, DANA), dan simulasi pajak PPh 21 NPPN untuk freelancer.

---

## 2. EXISTING SYSTEM AUDIT (BASELINE v1.0)

Modul-modul berikut **sudah beroperasi penuh dan terverifikasi** dalam codebase saat ini. Implementasi fitur baru **DILARANG MERUSAK** kontrak yang telah ada:

```
[ EXISTING AUDIT MATRIX ]
├── Core Engine:
│   ├── Next.js 16.3.5 (App Router, Webpack/Turbopack) + React 19.2.8 + Tailwind CSS v4
│   ├── TiDB Cloud MySQL 8 via Drizzle ORM (schema: users, accounts, sessions, categories, wallets, transactions, vaults, debts, budgets, recurringRules)
│   └── Node.js >=22 runtime dengan strict TypeScript 5.0
├── Authentication & Hardening:
│   ├── Auth.js (NextAuth v5 beta) + Password hashing (bcryptjs) + CSRF protection
│   ├── Distributed Rate Limiter pada auth & scan endpoints (`authRateLimits` table)
│   ├── Full-screen App Lock: 6-digit PIN (Web Crypto SHA-256 + random salt) + WebAuthn Biometrics
│   └── Account Lifecycle: Atomic cascading account purge lintas seluruh relasi tabel
├── Financial Modules:
│   ├── Wallets: Multi-account (Cash, Bank, E-Wallet) + Transfer antar-dompet + Archive toggle
│   ├── Transactions: QuickLog 2-tap + cursor pagination (30 rows/page) + category chips + multi-tag Unicode
│   ├── Vaults: Tabungan target terisolasi dari saldo belanja + kalkulator proyeksi waktu
│   ├── Debts: Utang & Piutang + pelunasan cicilan parsial / lunas
│   ├── Planning: Budgeting bulanan kategori + Recurring reminders countdown (H-X) + 1-klik debit
│   └── Safe-to-Spend: Metrik batas belanja harian aman berbasis sisa hari dalam bulan (Timezone: Asia/Makassar)
├── Intelligence & Utilities:
│   ├── OCR Receipt Scanner: Gemini 3.8 Flash cascade ke 3.7 & 3.6 Flash + drag & drop + paste (Ctrl+V)
│   ├── AI Coach Chat: Kontekstual metrik saldo real-time + sanitasi thought tokens
│   ├── Export Data: Full JSON dump & CSV filter dengan pembuktian mutlak zero-secret leak
│   ├── Monthly Recap: WhatsApp 1-klik share template & PDF print preview (@media print)
│   └── Desktop Shortcuts: 'c' (catat), '/' (cari), 'p' (privasi), '?' (bantuan), Escape (tutup modal)
└── Verification Gate:
    ├── 22 TiDB Integration Suites (`npm run test:db`)
    ├── 70 Browser CDP Audit Suites (`npm run test:browser` @ 320px, 390px, 1280px)
    └── Unit Tests & Timezone Boundary Suites (`npm run test:unit`)
```

---

## 3. FEATURE SPECIFICATIONS: THE NEXT-LEVEL EXPANSION (v2.0 & v3.0)

Berikut adalah 9 Epic fitur unggulan baru yang harus diimplementasikan secara bertahap oleh autonomous coding agents:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   KASDESK EXPANSION ROADMAP MATRIX                     │
├────────────────────────────────────────────────────────────────────────┤
│ EPIC 1: Multi-Currency, Forex, Emas & Crypto Net Worth Rollup         │
│ EPIC 2: Smart Split-Bill & WhatsApp Social Settlement Engine   [DONE]  │
│ EPIC 3: Predictive Cashflow Forecast & Financial Autopilot     [DONE]  │
│ EPIC 4: Bank Statement & E-Wallet PDF/CSV Import Engine        [DONE]  │
│ EPIC 5: Digital Envelopes (ZBB) & Micro-Savings Auto-Rules     [DONE*] │
│ EPIC 6: Shared Financial Spaces (Mode Rumah Tangga & Pasutri)          │
│ EPIC 7: AI Financial Coach v2 (Conversational & Tax Simulator) [DONE]  │
│ EPIC 8: Native PWA Superpowers (Web Push, Share Target, Icons)         │
│ EPIC 9: Client-Side Encrypted Backup & Cloud Sync (Zero-Knowl) [DONE]  │
│ DUAL-MODE AI COPILOT: Manual + AI across all pillars           [DONE]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3.1 EPIC 1: Multi-Currency, Forex, Emas & Crypto Net Worth Rollup

#### 3.1.1 Problem Statement
Pengguna modern memiliki aset terdistribusi: rekening bank lokal (IDR), dompet luar negeri/PayPal/Stripe (USD/SGD), tabungan emas digital (Antam gram), dan aset kripto (USDT/BTC). Saat ini KasDesk hanya mendukung hardcoded IDR pada tingkat kalkulasi saldo total, membuat pelacakan kekayaan bersih (*Net Worth*) global menjadi tidak akurat.

#### 3.1.2 Functional Requirements
1. **Multi-Currency Wallets**:
   - Kolom `currency` pada dompet mendukung: `IDR`, `USD`, `SGD`, `EUR`, `JPY`, `MYR`, `XAU` (Emas Gram), `USDT`, `BTC`, `ETH`.
   - Simbol mata uang dan format desimal adaptif:
     - Fiat IDR/JPY: 0 desimal (`Rp 150.000`, `¥ 1,500`).
     - Fiat USD/SGD/EUR: 2 desimal (`$ 120.50`, `S$ 85.00`).
     - XAU (Emas): 3 desimal (`2.500 gram`).
     - Crypto BTC/ETH: hingga 6 desimal (`0.004250 BTC`).
2. **Automated & Cached Exchange Rates**:
   - Tabel `exchangeRates` menyimpan kurs terhadap base currency (`IDR`).
   - Pembaruan berkala via endpoint terjadwal (menggunakan Bank Indonesia / Open Exchange Rates / CoinGecko public rates) dengan fallback offline ter-cache di IndexedDB.
   - Pengguna dapat melakukan override manual pada kurs konversi jika diinginkan.
3. **Consolidated Net Worth Card**:
   - Dashboard utama menampilkan total **Net Worth** (Kekayaan Bersih Terkonsolidasi) dalam mata uang utama pengguna (`users.currency`).
   - Setiap dompet non-IDR menampilkan dua baris: nominal asli valas/kripto dan estimasi ekuivalen IDR di bawahnya.
4. **Historical Mutation Rate Invariant**:
   - Setiap transaksi valas mencatat `exchangeRateAtOccurred` pada saat transaksi dibuat agar grafik historis tidak berfluktuasi akibat pergerakan kurs di masa depan.

#### 3.1.3 Acceptance Criteria
- [ ] Dompet dengan mata uang USD dapat menerima transaksi `$ 50.00`.
- [ ] Saldo total pada dashboard terkonversi otomatis ke IDR menggunakan kurs aktif tanpa delay.
- [ ] Saat koneksi internet mati (offline), konversi menggunakan kurs snapshot terakhir dari IndexedDB.
- [ ] Input kalkulator bekerja mulus sesuai presisi desimal masing-masing mata uang.

---

### 3.2 EPIC 2: Smart Split-Bill & WhatsApp Social Settlement Engine

#### 3.2.1 Problem Statement
Makan bersama atau patungan proyek sering menimbulkan friksi hitung-hitungan: struk mencantumkan pajak restoran PB1 (10-11%), service charge (5-10%), atau diskon voucher. Menghitung manual porsi masing-masing orang memakan waktu dan canggung saat menagih.

#### 3.2.2 Functional Requirements
1. **OCR-Assisted Itemized Breakdown**:
   - Pengguna mengambil foto struk belanjaan (atau upload gambar). Gemini OCR mendeteksi:
     - Daftar item dan harga individual.
     - Nilai Subtotal, Tax/Pajak (PB1), Service Charge, dan Diskon.
2. **Participant Allocation Matrix**:
   - Pengguna dapat menambahkan nama teman (misal: "Budi", "Siti", "Saya").
   - Menugaskan item ke orang tertentu, atau menandai item sebagai **"Shared / Patungan Rata"** (misal: kentang goreng dimakan bersama).
3. **Proportional Tax & Service Distribution Algorithm**:
   - Pajak dan service charge didistribusikan secara **proporsional** berdasarkan persentase subtotal pesanan masing-masing individu, bukan dibagi rata buta:
     $$\text{Porsi Pajak Individu} = \text{Total Pajak} \times \left( \frac{\text{Subtotal Individu}}{\text{Subtotal Keseluruhan}} \right)$$
   - Pembulatan matematis menghasilkan selisih 0 rupiah terhadap total nominal struk fisik.
4. **WhatsApp Settlement Message Generator**:
   - Menghasilkan draf teks penagihan elegan siap kirim ke WhatsApp:
     ```text
     Halo Budi! 👋 Ini rincian patungan kita di *Warung Steak*:
     - Sirloin Steak: Rp 85.000
     - Es Lemon Tea: Rp 15.000
     - Porsi Pajak & Service: Rp 11.500
     -----------------------------
     *Total Bagianmu: Rp 111.500*

     Bisa transfer ke:
     BCA: 1234567890 a.n Dhani
     Atau scan QRIS: https://kasdesk.app/pay/budi-xyz
     Terima kasih! 🙏
     ```
5. **Direct Integration with Debts (Piutang)**:
   - Satu tombol: **"Simpan ke Catatan Piutang"** otomatis membuat record pada tabel `debts` untuk setiap teman yang belum lunas.
   - Saat teman membayar via transfer, pengguna cukup tap **"Tandai Lunas"**, yang langsung mendebit saldo dompet tujuan dan menutup status piutang.

#### 3.2.3 Acceptance Criteria
- [ ] Total tagihan seluruh partisipan setelah ditambah proporsi pajak & service sama persis dengan total struk.
- [ ] WhatsApp share button membuka aplikasi WhatsApp dengan teks yang terformat rapi dan tautan pembayaran.
- [ ] Status piutang otomatis tersinkronisasi ke modul `debts`.

---

### 3.3 EPIC 3: Predictive Cashflow Forecast & Financial Autopilot (Personal Runway)

#### 3.3.1 Problem Statement
Aplikasi keuangan konvensional hanya memberi tahu *ke mana uang telah pergi* (retrospektif). Pengguna membutuhkan proyeksi ke depan: *apakah uang saya cukup sampai tanggal gajian berikutnya? Kapan saldo saya berada di titik kritis?*

#### 3.3.2 Functional Requirements
1. **30/60/90-Day Cashflow Curve Simulation**:
   - Algoritma proyeksi saldo harian menggabungkan 3 komponen:
     1. Saldo aktif saat ini ($S_0$).
     2. Jadwal pemasukan & pengeluaran rutin dari `recurringRules` (gaji, sewa kos, langganan internet).
     3. Rata-rata pengeluaran variabel harian (*Discretionary Burn Rate*) berbasis pergerakan 30 hari terakhir:
        $$S(t) = S(t-1) + \text{InflowScheduled}(t) - \text{OutflowScheduled}(t) - \text{BurnRateHarian}$$
2. **"Tanggal Kritis" (Overdraft & Threshold Alert)**:
   - Jika kurva saldo diproyeksikan menembus batas aman (misal: di bawah Rp 500.000) sebelum tanggal gajian berikutnya, kartu peringatan muncul di Beranda:
     `⚠️ Perhatian: Pada tanggal 24 bulan ini saldo diproyeksikan tersisa Rp 210.000 sebelum gajian masuk tanggal 27. Kurangi pengeluaran harian sebesar Rp 35.000/hari.`
3. **Emergency Fund Runway & Survival Index**:
   - Menghitung daya tahan dana darurat dalam satuan bulan:
     $$\text{Runway (Bulan)} = \frac{\text{Total Saldo Likuid (Cash + Bank)}}{\text{Rata-rata Pengeluaran Kebutuhan Pokok per Bulan}}$$
   - Indikator visual dinamis: Merah (< 3 bulan), Kuning (3 - 6 bulan), Hijau (6 - 12 bulan), Diamond (> 12 bulan).
4. **Interactive "What-If" Scenario Simulator**:
   - Slider interaktif: "Bagaimana jika saya membeli gadget seharga Rp 10.000.000 bulan ini?"
   - Grafik langsung memproyeksikan dampaknya terhadap sisa tabungan dan waktu pencapaian target Vault.

#### 3.3.3 Acceptance Criteria
- [ ] Grafik proyeksi 30 hari ter-render dalam canvas/SVG ringan (<20KB, zero heavy chart libraries).
- [ ] Deteksi tanggal kritis akurat berdasarkan data recurring rules dan historical burn rate.
- [ ] Responsif pada viewport mobile 320px tanpa pergeseran horizontal.

---

### 3.4 EPIC 4: Bank Statement & E-Wallet PDF/CSV Import Engine (Zero-Credential)

#### 3.4.1 Problem Statement
Memasukkan mutasi satu per satu dari rekening bank atau e-wallet merepotkan. Menghubungkan akun bank langsung via aggregator pihak ketiga berisiko keamanan dan sering kali memicu kekhawatiran privasi pengguna Indonesia.

#### 3.4.2 Functional Requirements
1. **Privacy-Safe Client-Side Extraction**:
   - Pengguna mengunggah e-Statement PDF atau CSV resmi yang diunduh dari mobile banking mereka.
   - Ekstraksi berjalan **100% di browser pengguna** menggunakan Web Worker (tidak ada password, nomor rekening utuh, atau file PDF mentah yang disimpan di server).
2. **Supported Financial Institutions (Indonesian Native)**:
   - **BCA**: e-Statement KlikBCA / myBCA (PDF/CSV).
   - **Bank Mandiri**: Livin by Mandiri e-Statement (PDF).
   - **BRI**: BRImo e-Statement (PDF/CSV).
   - **BNI**: BNI Mobile Banking mutasi (CSV/PDF).
   - **GoPay / ShopeePay / OVO / DANA**: Laporan mutasi bulanan (PDF/CSV).
3. **Deduplication Engine (SHA-256 Mutation Fingerprint)**:
   - Setiap mutasi menghasilkan hash unik:
     $$\text{Fingerprint} = \text{SHA256}(\text{userId} + \text{walletId} + \text{occurredAtIso} + \text{amount} + \text{normalizedTitle})$$
   - Sistem mencocokkan fingerprint dengan tabel `transactions` dan menandai baris yang sudah pernah dicatat dengan badge *"Sudah Terdaftar"*.
4. **Smart Auto-Categorization Heuristics**:
   - Mesin aturan lokal memetakan deskripsi mutasi ke kategori KasDesk:
     - `INDOMARET`, `ALFAMART`, `SUPERINDO` $\rightarrow$ Kategori `#Belanja`
     - `PLN`, `TELKOM`, `TOKEN`, `BPJS` $\rightarrow$ Kategori `#Tagihan`
     - `GOPAY`, `OVO TOPUP`, `SHOPEEPAY` $\rightarrow$ Kategori `#Transfer` / `#E-Wallet`
     - `BUNGA`, `SALARY`, `PAYROLL` $\rightarrow$ Pemasukan `#Gaji`
5. **Interactive Review & Commit Sheet**:
   - Pengguna meninjau daftar mutasi dalam tabel sebelum disimpan.
   - Pilihan checkbox untuk memilih mutasi mana saja yang ingin diimpor.

#### 3.4.3 Acceptance Criteria
- [ ] Unggahan file e-Statement BCA PDF 5 halaman terurai dalam waktu < 2.5 detik di perangkat mobile.
- [ ] Mutasi ganda terdeteksi 100% dan dinonaktifkan secara otomatis.
- [ ] Transaksi yang disetujui ter-commit ke database dalam satu atomic batch transaction.

---

### 3.5 EPIC 5: Digital Envelopes (ZBB) & Micro-Savings Auto-Rules

#### 3.5.1 Problem Statement
Banyak pengguna gagal menabung karena menunggu sisa uang di akhir bulan. Konsep **Zero-Based Budgeting (ZBB)** dan **Micro-Savings (Celengan Pembulatan)** terbukti mengubah psikologi pengeluaran secara drastis.

#### 3.5.2 Functional Requirements
1. **Digital Envelope Allocation**:
   - Pengguna mengalokasikan setiap pemasukan ke "amplop" anggaran tertentu:
     - Amplop Wajib / Kebutuhan Pokok (50%)
     - Amplop Tabungan & Investasi (20%)
     - Amplop Keinginan & Rekreasi (30%)
   - Setiap kali mencatat transaksi, saldo amplop kategori berkurang secara visual.
2. **Spare-Change Round-Up ("Celengan Pembulatan")**:
   - Fitur otomatisasi pembulatan receh transaksi belanja ke Vault pilihan:
     - Contoh mode Rp 5.000: Belanja kopi Rp 22.000 dibulatkan menjadi Rp 25.000.
     - Rp 22.000 masuk mutasi pengeluaran `#Kopi`.
     - Rp 3.000 otomatis dialokasikan ke Vault "Dana Liburan" atau "Emas".
   - Opsi pembulatan yang tersedia: ke Rp 1.000, Rp 5.000, atau Rp 10.000 terdekat.
3. **"Pay Yourself First" Rules**:
   - Aturan pemicu otomatis: setiap kali ada transaksi tipe `income` dengan nominal $\ge \text{Rp } 1.000.000$, KasDesk memunculkan dialog 1-tap:
     `Gaji Rp 8.000.000 terdeteksi! Sisihkan 15% (Rp 1.200.000) ke Vault Dana Darurat sekarang? [Ya, Tabung Sekarang] [Nanti Saja]`.

#### 3.5.3 Acceptance Criteria
- [x] Transaksi pembulatan menciptakan alokasi mutasi yang benar tanpa mengurangi saldo dompet secara ganda (atomic debit di `createTransaction`).
- [x] Progres Vault meningkat secara otomatis saat transaksi pembulatan aktif (`currentAmount` terupdate).
- [x] Dialog dan rekomendasi "Pay Yourself First" aktif untuk transaksi pemasukan $\ge \text{Rp } 1.000.000$.
- [x] Modal konfigurasi Celengan Pembulatan (`RoundUpSettingsModal`) mendukung pilihan step Rp 1.000, Rp 5.000, dan Rp 10.000 dengan preview kalkulasi live.

---

### 3.6 EPIC 6: Shared Financial Spaces (Mode Rumah Tangga & Pasutri)

#### 3.6.1 Problem Statement
Pasangan suami-istri atau rekan satu kost ingin mengelola anggaran bersama (belanja bulanan, bayar sewa, tagihan listrik), namun tetap menginginkan privasi atas dompet dan transaksi pribadi mereka.

#### 3.6.2 Functional Requirements
1. **Dual-Ledger Architecture (Personal vs Shared Space)**:
   - Akun pengguna dapat memiliki atau bergabung ke dalam **Shared Space** (misal: "Rumah Tangga Kita").
   - Switcher ruang kerja instan di header atas:
     `[ 👤 Dompet Pribadi ] <---> [ 🏠 Kas Rumah Tangga ]`.
   - Transaksi di Dompet Pribadi **100% terisolasi** dan tidak dapat dilihat oleh anggota Shared Space.
2. **Role-Based Space Access Control (RBAC)**:
   - **Owner**: Pemilik ruang, dapat mengundang/menghapus anggota, menghapus ruang.
   - **Editor / Member**: Dapat mencatat mutasi bersama, melihat laporan, menambah budget.
   - **Viewer**: Hanya dapat melihat ringkasan tanpa izin mengubah transaksi.
3. **Attribution & Audit Trail**:
   - Setiap mutasi pada shared space mencatat `createdByUserId` dan menampilkan avatar/nama inisial pencatat di feed transaksi (misal: *"Dicatat oleh Sarah"*).
4. **Shared Budgets & Vaults**:
   - Anggaran bersama untuk kebutuhan rumah tangga dengan status progres yang terupdate saat salah satu pihak mencatat belanjaan.

#### 3.6.3 Acceptance Criteria
- [ ] Anggota Shared Space tidak memiliki akses apapun ke tabel transaksi personal pengguna lain.
- [ ] Pengurangan saldo pada shared wallet ter-sync secara real-time antar sesi anggota.

---

### 3.7 EPIC 7: AI Financial Coach v2 (Proactive Insights & Freelancer Tax Simulator)

#### 3.7.1 Problem Statement
AI chat reaktif membutuhkan pengguna yang aktif bertanya. AI harus menjadi proaktif dalam mendeteksi kebocoran finansial (*spending anomalies*) dan memberikan simulasi pajak nyata yang relevan bagi tenaga kerja modern Indonesia.

#### 3.7.2 Functional Requirements
1. **Weekly Automated Financial Digest (Sunday 20:00)**:
   - Setiap Minggu malam, sistem menghasilkan kartu ringkasan proaktif tanpa perlu ditanya:
     - Total pengeluaran minggu ini vs minggu lalu (WoW %).
     - Kategori dengan lonjakan tertinggi (misal: *"Pengeluaran Cafe melonjak +64% minggu ini"*).
     - Pujian gamifikasi jika berhasil menekan pengeluaran di bawah target Safe-to-Spend.
2. **Subscription Creep & Leakage Watcher**:
   - Mendeteksi kenaikan tagihan langganan berkala (misal: Netflix naik dari Rp 186.000 ke Rp 205.000) dan mengingatkan pengguna untuk mengevaluasi langganan yang jarang digunakan.
3. **Indonesian Freelancer Tax Simulator (PPh 21 Norma NPPN)**:
   - Perhitungan estimasi pajak penghasilan pribadi tahunan khusus pekerja lepas / content creator / developer / desainer menggunakan skema resmi DJP:
     $$\text{Penghasilan Neto} = \text{Omzet Bruto} \times \text{Tarif Norma (e.g. 50\%)}$$
     $$\text{Penghasilan Kena Pajak (PKP)} = \text{Penghasilan Neto} - \text{PTKP}$$
     - Pilihan PTKP: TK/0 (Rp 54 jt), K/0 (Rp 58.5 jt), K/1 (Rp 63 jt), K/2, K/3.
     - Tarif Progresif Pasal 17 UU HPP (5%, 15%, 25%, 30%, 35%).
   - Indikator real-time: menampilkan estimasi kewajiban pajak yang harus disisihkan per bulan agar tidak kaget saat SPT Tahunan bulan Maret.

#### 3.7.3 Acceptance Criteria
- [ ] Digest mingguan muncul otomatis di Beranda pada waktu yang ditentukan.
- [ ] Kalkulator PPh 21 menghasilkan angka rupiah yang sesuai 100% dengan formulir SPT 1770 DJP.
- [ ] Bebas dari halusinasi dan tidak menggunakan dependensi AI eksternal yang lambat untuk matematika deterministik.

---

### 3.8 EPIC 8: Native PWA Superpowers & Hardware Integration

#### 3.8.1 Problem Statement
Pengguna mobile sering lupa mencatat pengeluaran setelah bertransaksi di kasir atau menerima resi di aplikasi lain.

#### 3.8.2 Functional Requirements
1. **Web Push Notifications**:
   - Push notification berkala berbasis Web Push API (VAPID):
     - **H-3 & H-1 Tagihan**: Pengingat jatuh tempo pembayaran listrik / cicilan.
     - **Pengingat Harian Pukul 20:00**: *"Ada pengeluaran hari ini yang belum dicatat? Tap di sini untuk 2-tap log!"*
     - **Peringatan 90% Budget**: *"Anggaran Makan & Minum sudah terpakai 92%!"*
2. **Web Share Target API**:
   - KasDesk terdaftar di menu "Share" Android & iOS.
   - Saat pengguna menerima struk PDF atau screenshot bukti transfer di WhatsApp/Galeri, pengguna cukup tap tombol **Share -> KasDesk**.
   - KasDesk langsung membuka QuickLog Sheet dengan gambar struk yang siap diproses oleh Gemini OCR.
3. **App Shortcuts & Quick Actions**:
   - Long-press icon KasDesk di home screen memunculkan shortcut:
     - ⚡ *Catat Cepat* (Buka QuickLog langsung)
     - 📸 *Scan Struk* (Buka Kamera OCR langsung)
     - 📊 *Laporan Bulan Ini* (Buka Insights)
4. **Tactile & Visual Polish**:
   - Haptic vibration patterns berbeda untuk aksi sukses (`[15ms]`), hapus (`[30ms, 50ms, 30ms]`), dan warning.

#### 3.8.3 Acceptance Criteria
- [ ] Push notification berhasil diterima di background saat browser dalam kondisi tertutup (Chrome Android & Safari iOS 16.4+).
- [ ] File gambar dari galeri berhasil dioper via Web Share Target langsung ke pipeline OCR.

---

### 3.9 EPIC 9: Client-Side Encrypted Backup & Cloud Sync (Zero-Knowledge)

#### 3.9.1 Problem Statement
Pengguna sangat sensitif terhadap data finansial. Mereka membutuhkan kepastian bahwa jika server bermasalah atau mereka ingin berganti platform, data mereka dapat di-backup secara penuh dengan enkripsi yang tidak dapat diintip oleh siapapun (termasuk admin server).

#### 3.9.2 Functional Requirements
1. **Passphrase-Derived Client-Side Encryption**:
   - Ekspor data dienkripsi langsung di browser menggunakan Web Crypto API:
     - Algoritma: `AES-256-GCM`.
     - Key Derivation: `PBKDF2` dengan 100.000 iterasi dan salt acak kriptografis 16-byte.
   - File keluaran berupa container biner/JSON berekstensi `.kasdesk.enc`.
2. **Zero-Knowledge Guarantee**:
   - Passphrase tidak pernah dikirim ke server. Server hanya menerima dan menyimpan ciphertext jika pengguna memilih sinkronisasi cloud.
3. **Self-Hosted & Private Cloud Targets**:
   - Opsi backup otomatis ke:
     - Google Drive pribadi (menggunakan scoped OAuth `drive.appdata`).
     - Akun WebDAV pribadi pengguna (Nextcloud, Synology NAS, Koofr).
4. **Full Disaster Recovery Restore**:
   - Pengguna dapat mengunggah file `.kasdesk.enc`, memasukkan passphrase, dan sistem akan melakukan verifikasi integritas checksum sebelum mengimpor seluruh tabel secara atomik.

#### 3.9.3 Acceptance Criteria
- [ ] File backup yang dienkripsi tidak dapat dibaca menggunakan teks biasa.
- [ ] Password yang salah memunculkan error dekripsi aman tanpa merusak database yang ada.

---

## 4. DATABASE SCHEMA EVOLUTION (MIGRATIONS 0005 - 0008)

Untuk mendukung 9 Epic di atas, berikut adalah rancangan skema Drizzle ORM baru yang kompatibel penuh dengan MySQL 8 / TiDB Cloud:

### 4.1 Migration `0005_multi_currency_and_rates.sql`
```sql
-- Tambah kolom currency & exchangeRate pada tabel wallets dan transactions
ALTER TABLE `wallets`
  ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR' AFTER `type`;

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

### 4.2 Migration `0006_split_bills.sql`
```sql
-- Tabel induk Split-Bill
CREATE TABLE IF NOT EXISTS `splitBills` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `subtotal` BIGINT NOT NULL,
  `taxAmount` BIGINT NOT NULL DEFAULT 0,
  `serviceAmount` BIGINT NOT NULL DEFAULT 0,
  `discountAmount` BIGINT NOT NULL DEFAULT 0,
  `totalAmount` BIGINT NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'active', -- active, settled, archived
  `receiptImageUrl` VARCHAR(500) DEFAULT NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `split_bills_user_idx` (`userId`, `occurredAt`),
  CONSTRAINT `split_bills_total_ck` CHECK (`totalAmount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel rincian anggota dan pembagian tagihan
CREATE TABLE IF NOT EXISTS `splitBillMembers` (
  `id` CHAR(36) NOT NULL,
  `splitBillId` CHAR(36) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `phoneNumber` VARCHAR(32) DEFAULT NULL,
  `subtotalShare` BIGINT NOT NULL DEFAULT 0,
  `taxShare` BIGINT NOT NULL DEFAULT 0,
  `serviceShare` BIGINT NOT NULL DEFAULT 0,
  `totalShare` BIGINT NOT NULL,
  `paidAmount` BIGINT NOT NULL DEFAULT 0,
  `isSettled` TINYINT NOT NULL DEFAULT 0,
  `debtId` CHAR(36) DEFAULT NULL, -- Terhubung dengan tabel debts jika dijadikan piutang
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `split_bill_members_bill_idx` (`splitBillId`),
  KEY `split_bill_members_debt_idx` (`debtId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.3 Migration `0007_savings_rules_and_imports.sql`
```sql
-- Aturan otomatisasi celengan (Round-Up & Pay Yourself First)
CREATE TABLE IF NOT EXISTS `savingsRules` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `vaultId` CHAR(36) NOT NULL,
  `sourceWalletId` CHAR(36) DEFAULT NULL,
  `ruleType` VARCHAR(20) NOT NULL, -- round_up, pay_yourself_first
  `roundUpUnit` INT DEFAULT 5000,   -- pembulatan ke 1000, 5000, 10000
  `percentage` INT DEFAULT NULL,    -- persentase dari gaji (e.g. 10%)
  `isActive` TINYINT NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `savings_rules_user_idx` (`userId`, `isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fingerprint log untuk deduplikasi mutasi import bank/e-wallet
CREATE TABLE IF NOT EXISTS `statementImports` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `walletId` CHAR(36) NOT NULL,
  `mutationFingerprint` CHAR(64) NOT NULL, -- SHA-256
  `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `statement_fingerprint_uq` (`userId`, `walletId`, `mutationFingerprint`),
  KEY `statement_imports_user_wallet_idx` (`userId`, `walletId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.4 Migration `0008_shared_spaces_and_push.sql`
```sql
-- Ruang Finansial Bersama (Shared Spaces / Household Mode)
CREATE TABLE IF NOT EXISTS `sharedSpaces` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `ownerId` CHAR(36) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `shared_spaces_owner_idx` (`ownerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `spaceMembers` (
  `id` CHAR(36) NOT NULL,
  `spaceId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `role` VARCHAR(16) NOT NULL DEFAULT 'editor', -- owner, editor, viewer
  `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `space_members_space_user_uq` (`spaceId`, `userId`),
  KEY `space_members_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tambah foreign key spaceId ke transactions & wallets (opsional / null jika personal)
ALTER TABLE `wallets` ADD COLUMN `spaceId` CHAR(36) DEFAULT NULL AFTER `userId`;
ALTER TABLE `transactions` ADD COLUMN `spaceId` CHAR(36) DEFAULT NULL AFTER `userId`;

-- Tabel subscription Web Push Notifications
CREATE TABLE IF NOT EXISTS `pushSubscriptions` (
  `id` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `userAgent` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_endpoint_uq` (`endpoint`),
  KEY `push_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 5. UI/UX DESIGN SYSTEM & COMPONENT MODULARITY

Setiap komponen UI baru wajib tunduk pada standar arsitektur berikut:

### 5.1 Standar Modul & File Boundary (<300-500 LOC)
| Komponen Baru | Jalur File | Estimasi LOC | Tugas Utama |
| :--- | :--- | :--- | :--- |
| `NetWorthCard.tsx` | `components/dashboard/NetWorthCard.tsx` | ~120 LOC | Tampilan total kekayaan multi-valas + toggle breakdown |
| `CurrencyBadge.tsx` | `components/ui/CurrencyBadge.tsx` | ~45 LOC | Badge mata uang & ikon koin SVG |
| `SplitBillSheet.tsx` | `components/splitbill/SplitBillSheet.tsx` | ~240 LOC | Bottom sheet pembagian struk per orang |
| `SplitBillReview.tsx` | `components/splitbill/SplitBillReview.tsx` | ~180 LOC | Pratinjau hitungan porsi pajak & tombol WhatsApp |
| `CashflowForecast.tsx` | `components/insights/CashflowForecast.tsx` | ~220 LOC | Grafik proyeksi 30-90 hari SVG + Tanggal Kritis |
| `RunwayMeter.tsx` | `components/insights/RunwayMeter.tsx` | ~110 LOC | Visual meter daya tahan dana darurat |
| `StatementImportModal.tsx` | `components/importer/StatementImportModal.tsx` | ~250 LOC | Dialog dropzone PDF/CSV + review mutasi |
| `SavingsRuleSheet.tsx` | `components/vaults/SavingsRuleSheet.tsx` | ~160 LOC | Form aturan celengan pembulatan belanja |
| `TaxEstimatorModal.tsx` | `components/coach/TaxEstimatorModal.tsx` | ~230 LOC | Form interaktif simulasi PPh 21 NPPN |
| `SpaceSwitcher.tsx` | `components/navigation/SpaceSwitcher.tsx` | ~110 LOC | Dropdown pilih ruang kerja (Pribadi vs Rumah Tangga) |

### 5.2 Responsive & Accessibility Rules
- **No Horizontal Scroll**: Seluruh komponen diuji bebas overflow pada lebar `320px` (iPhone SE), `390px` (iPhone 14/15/16), `768px` (iPad), dan `1280px` (Desktop).
- **Dark/Light Mode**: Menggunakan CSS Variables adaptif (`var(--background)`, `var(--foreground)`, `var(--card)`, `var(--border)`, `var(--primary)`). Tidak boleh hardcode hex value tanpa wrapper variabel tema.
- **Keyboard Traps & Accessibility**:
  - Modal dan Sheet wajib mengunci focus (focus trap) dan merespons tombol `Escape` untuk menutup.
  - Setiap tombol dan form input memiliki `aria-label` eksplisit.
  - Input nominal menggunakan `inputMode="numeric"` atau `inputMode="decimal"` untuk memunculkan keyboard angka native di perangkat mobile.

---

## 6. SECURITY, PERFORMANCE & COMPLIANCE NON-NEGOTIABLES

1. **Zero Secret Leakage**:
   - Seluruh endpoint API (`/api/*`) dan Server Actions diverifikasi secara ketat. Dilarang mengembalikan `passwordHash`, `sessionToken`, `p256dh`, atau kredensial internal ke client payload.
   - Uji verifikasi rilis: `npm run release:check` wajib lulus 100%.
2. **Database Isolation & Tenant Protection**:
   - Setiap query `SELECT`, `UPDATE`, `DELETE` wajib memiliki klausa `WHERE userId = session.user.id`.
   - Pada fitur Shared Space, query wajib memvalidasi keanggotaan aktif pengguna pada tabel `spaceMembers` sebelum mengembalikan data ruang bersama.
3. **Transaction Safety**:
   - Dilarang keras melakukan kalkulasi saldo langsung di memory client lalu mengirimkan nilai saldo jadi ke server.
   - Saldo dompet (`wallets.balance`) hanya boleh dimutasi di dalam blok `db.transaction()` database dengan locking baris (`FOR UPDATE`) untuk mencegah *race condition* atau *double spending*.
4. **Performance & Bundle Budgets**:
   - First Load JS < 180 KB gzip.
   - Dynamic import (lazy loading) wajib diterapkan pada modul besar: PDF Parser, WebAuthn client, OCR Canvas, dan Chart Visualizers.
   - Lighthouse Score target minimum pada production: **Performance $\ge$ 92, Accessibility $\ge$ 96, Best Practices $\ge$ 96, SEO $\ge$ 92**.

---

## 7. STEP-BY-STEP IMPLEMENTATION ROADMAP FOR AI AGENTS

Dokumen ini disusun agar autonomous coding agents (Claude, Antigravity, Hermes subagents) dapat mengeksekusi pembangunan fitur secara independen dalam 4 fase terstruktur:

```
[ EXECUTION PHASES ]
├── FASE 1: Core Extension (Multi-Currency & Statement Importer)
│   ├── Step 1.1: Buat migrasi SQL 0005 & perbarui schema Drizzle (`lib/db/schema.ts`)
│   ├── Step 1.2: Implementasikan `lib/currency.ts` (kurs engine + cache fallback)
│   ├── Step 1.3: Update wallet actions & form input untuk mendukung valas
│   ├── Step 1.4: Buat `lib/importer/` parser PDF/CSV bank lokal & SHA-256 deduplication
│   └── Step 1.5: Buat test suite integrasi database untuk multi-currency & statement import
│
├── FASE 2: Social & Smart Savings (Split-Bill & Digital Envelopes)
│   ├── Step 2.1: Buat migrasi SQL 0006 & 0007 (splitBills & savingsRules)
│   ├── Step 2.2: Implementasikan algoritma pembagian pajak proporsional (`lib/split-bill.ts`)
│   ├── Step 2.3: Buat generator teks WhatsApp & integrasi sinkronisasi ke tabel `debts`
│   ├── Step 2.4: Buat logika pembulatan celengan otomatis pada pipeline transaksi [DONE]
│   └── Step 2.5: Buat unit & database tests untuk split-bill dan aturan celengan [DONE]
│
├── FASE 3: Financial Autopilot (Predictive Cashflow, Coach v2 & Pajak)
│   ├── Step 3.1: Buat kalkulator proyeksi arus kas 30/60/90 hari (`lib/analytics/forecast.ts`)
│   ├── Step 3.2: Buat detektor "Tanggal Kritis" dan kalkulator Runway Dana Darurat
│   ├── Step 3.3: Implementasikan kalkulator pajak PPh 21 NPPN Indonesia (`lib/tax.ts`)
│   ├── Step 3.4: Buat UI Cashflow Forecast Canvas & Tax Estimator Modal
│   └── Step 3.5: Tambahkan automated test verifikasi batas matematis pajak & proyeksi
│
└── FASE 4: Collaboration & Native PWA (Shared Spaces, Push & Encrypted Sync)
    ├── Step 4.1: Buat migrasi SQL 0008 (sharedSpaces, spaceMembers, pushSubscriptions)
    ├── Step 4.2: Implementasikan RBAC & isolasi query untuk Shared Space
    ├── Step 4.3: Konfigurasi Web Push Notifications (Service Worker + VAPID)
    ├── Step 4.4: Implementasikan modul backup client-side AES-256-GCM (`lib/crypto/backup.ts`)
    └── Step 4.5: Jalankan `npm run test:full` (unit, lint, typecheck, DB suites, browser audit)
```

---

## 8. DEFINITION OF DONE (DoD) & QUALITY GATES

Sebuah fitur atau fase baru dinyatakan **SELESAI (1000/1000 APPROVED)** hanya jika memenuhi seluruh kriteria berikut:

1. **Test Coverage**:
   - Seluruh test baru terintegrasi ke dalam master test runner (`npm run test:unit`, `npm run test:db`, `npm run test:browser`).
   - Tidak ada test yang di-skip atau di-mock secara palsu.
2. **Type Safety & Lint**:
   - `npm run typecheck` menghasilkan 0 error (`exit code 0`).
   - `npm run lint` menghasilkan 0 warning dan 0 error.
3. **Browser & Mobile Viewport Audit**:
   - Diuji via Chrome CDP headless pada resolusi `320x568`, `390x844`, dan `1280x800` dengan pembuktian **0 horizontal overflow**.
   - Keyboard shortcut tetap berfungsi normal.
4. **Zero AI Slop**:
   - Tidak ada placeholder string ("Lorem ipsum", "Coming soon", tombol tanpa event handler). Seluruh tombol, modal, filter, dan form input berfungsi nyata dengan feedback status yang jelas.
5. **Documentation Synchronization**:
   - Perubahan skema dan endpoint baru selalu dicatat pada `CHANGELOG.md` dan `README.md` pada setiap siklus commit.

---
*Dokumen ini merupakan spesifikasi resmi KasDesk v2.0 & v3.0. Seluruh agen AI dan developer wajib mengikuti panduan ini tanpa penyimpangan arsitektur.*
