# Prompt final untuk Antigravity

Salin seluruh prompt di bawah ke Antigravity setelah mengekstrak ZIP ini.

---

Anda adalah senior full-stack engineer, security engineer, database engineer, PWA engineer, QA engineer, performance engineer, dan product designer. Kerjakan langsung project KasDesk ini sampai siap deployment Vercel dengan kualitas production terbaik. Jangan sekadar memberi saran: periksa source, jalankan perintah, perbaiki masalah, ulangi validasi, dan dokumentasikan hasil nyata.

## Aturan utama

1. Baca `README.md`, `ANTIGRAVITY-HANDOFF.md`, `CHANGELOG.md`, `SECURITY.md`, `RELEASE-CHECKLIST.md`, `package.json`, seluruh migrasi, dan konfigurasi deployment sebelum mengubah source.
2. Jangan menghapus fitur yang sudah berfungsi.
3. Jangan mengubah logika saldo tanpa database transaction, ownership check, concurrency test, dan regression test.
4. Jangan menambahkan AI slop, teks pemasaran berlebihan, mock data palsu, dependency besar tanpa alasan, atau fitur dekoratif yang memperlambat aplikasi.
5. Jangan menaruh secret pada source, log, README, screenshot, atau output terminal.
6. Anggap seluruh credential yang pernah dibagikan sebelumnya sudah bocor. Gunakan credential baru dari secret manager/environment Vercel.
7. Gunakan TiDB staging terlebih dahulu. Jangan menjalankan migrasi atau test destruktif langsung pada production.
8. Pertahankan desain premium, mobile-first, aksesibel, cepat, dan ringan.
9. Jika menemukan masalah, perbaiki akar penyebabnya. Jangan menyembunyikan error dengan mematikan lint, type checking, CSP, validasi, atau test.
10. Jangan mengklaim 10/10 tanpa bukti berupa build, test, Lighthouse, bundle report, database test, dan device/browser test.

## Tahap 1 — instalasi dan baseline

Gunakan Node.js 22 dan jalankan:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run release:check
```

Catat hasil awal sebelum melakukan perubahan. Pastikan `package-lock.json` tidak berubah tanpa alasan.

## Tahap 2 — environment dan credential

Buat `.env.local` dari `.env.example` menggunakan credential BARU:

```text
DATABASE_HOST
DATABASE_PORT
DATABASE_USER
DATABASE_PASSWORD
DATABASE_NAME
AUTH_SECRET
AUTH_URL
AUTH_TRUST_HOST
GEMINI_API_KEY
APP_TIME_ZONE=Asia/Makassar
```

Persyaratan:

- Jangan menggunakan kembali TiDB password, Gemini key, atau `AUTH_SECRET` lama.
- Jangan commit `.env.local`.
- Preview dan Production sebaiknya memakai database terpisah.
- Google OAuth tetap dinonaktifkan sampai account-linking dan integration test tersedia.

## Tahap 3 — database staging

1. Buat backup TiDB staging.
2. Pastikan backup dapat direstore.
3. Jalankan migrasi:

```bash
npm run db:push
```

Pastikan migrasi berikut tercatat dan checksum valid:

```text
0000_init.sql
0001_hardening.sql
0002_distributed_rate_limit.sql
0003_session_invalidation.sql
0004_planning.sql
```

Uji dua jalur:

- Database kosong: `0000` sampai `0004`.
- Upgrade database lama ke migrasi terbaru.

Verifikasi tabel/kolom/index penting:

```text
schema_migrations
authRateLimits
users.sessionInvalidBefore
transactions.clientMutationId
budgets
recurringRules
tx_user_client_mutation_uq
tx_user_date_idx
tx_wallet_date_idx
budgets_user_month_category_uq
```

## Tahap 4 — production build

Jalankan:

```bash
npm run build
npm run start
```

Perbaiki semua build error. Jangan mengganti production build dengan development server. Pastikan route groups `(public)` dan `(dashboard)` tidak membuat konflik URL.

## Tahap 5 — bundle dan performa

Gunakan bundle analyzer yang kompatibel dengan Next.js versi project. Periksa bahwa:

- Landing, login, dan registrasi tidak memuat `PendingTxProvider`, offline queue, BottomNav, atau OCR chunk.
- OCR benar-benar lazy-loaded.
- `lucide-react` tree-shaken.
- Tidak ada dependency client besar yang tidak digunakan.
- Tidak ada web-font download yang menghambat rendering.
- Tidak ada gambar besar tanpa optimasi.
- Tidak ada query browser yang mengirim data berlebih.

Jalankan Lighthouse pada:

```text
/welcome
/login
/register
/
/transactions
/planning
/insights
/settings
```

Target minimum pada build production:

```text
Performance >= 90 mobile
Accessibility >= 95
Best Practices >= 95
SEO >= 90 untuk landing publik
CLS < 0.1
LCP < 2.5 detik pada simulasi mobile
Tidak ada horizontal overflow pada 320px
```

Jika target gagal, perbaiki penyebabnya dan ulangi pengukuran.

## Tahap 6 — database dan keamanan

Jalankan seluruh test yang membutuhkan TiDB hanya pada staging/fixture disposable:

```bash
npm run test:auth
npm run test:balance
npm run test:balance:e2e
npm run test:concurrency
npm run test:debts
npm run test:debt-partial
npm run test:vaults
npm run test:delete
npm run test:transfer
npm run test:isolation
npm run test:register
npm run test:register:atomic
npm run test:dashboard
npm run test:insights
npm run test:archived
npm run test:wallet-archive
npm run test:input-bounds
npm run test:key-transport
npm run test:security-headers
npm run test:logout
npm run test:offline
```

Lalu bersihkan fixture:

```bash
npm run test:cleanup
npm run test:cleanup:fixtures
```

Wajib dibuktikan:

- Akun A tidak dapat membaca atau mengubah data akun B.
- Debit/transfer concurrent tidak membuat saldo negatif.
- Edit/hapus/reversal ditolak jika menghasilkan saldo tidak valid.
- `clientMutationId` mencegah transaksi ganda.
- Session lama ditolak setelah perubahan password.
- Akun yang dihapus tidak dapat menggunakan token lama.
- Distributed rate limiter bekerja lintas instance.
- OCR quota menggunakan distributed limiter.
- Export tidak memuat password hash, token, cookie, API key, atau secret.
- CSP, HSTS, nosniff, frame protection, referrer policy, dan permissions policy aktif sesuai environment.

## Tahap 7 — pengujian fitur

Uji minimal dengan dua akun:

### Transaksi

- Pemasukan, pengeluaran, dan transfer.
- Quick Log dan optimistic row.
- Offline queue lalu reconnect.
- Edit nominal, judul, kategori, catatan, dompet, tanggal, dan waktu.
- Hapus dan reversal.
- Search judul, catatan, serta kategori.
- Filter jenis, kategori, dompet, dan tanggal.
- Cursor pagination lebih dari 30 transaksi.
- Query tanggal/cursor rusak tidak menyebabkan crash.

### Planning

- Simpan dan update budget kategori yang sama.
- Total budget, terpakai, dan tersisa benar.
- Progress 75%, 90%, dan lebih dari 100% tetap aman.
- Pergantian bulan benar pada timezone `Asia/Makassar`.
- Tambah pengingat mingguan dan bulanan.
- Toggle aktif/nonaktif.
- Ownership pengingat tidak dapat ditembus akun lain.
- Feedback sukses/error dan loading form bekerja.
- Submit ganda tidak menghasilkan record tidak sengaja.

### Account lifecycle

- Registrasi dan login.
- Password salah dan rate limiting.
- Ubah password dan invalidasi sesi lama.
- Export lengkap.
- Hapus akun permanen.
- Budget dan pengingat ikut terhapus.

### OCR

```bash
npm run test:ocr
npm run test:ocr:limits
npm run test:ocr-real
```

`test:ocr-real` menggunakan kuota Gemini. Jalankan terkendali dan jangan menyimpan foto struk pada log.

## Tahap 8 — PWA dan perangkat nyata

Uji melalui HTTPS Preview Vercel:

### iPhone/iPad Safari

- Add to Home Screen.
- Safe area dan home indicator.
- Keyboard tidak menutup field/tombol.
- Zoom 200% tetap dapat digunakan.
- Offline queue dan reconnect.
- Logout membersihkan Cache Storage dan IndexedDB.

### Android Chrome

- Install prompt.
- Standalone mode.
- Maskable icon.
- Service-worker update.
- Offline queue dan pergantian akun.

### Desktop Chrome/Edge

- Install PWA.
- Keyboard navigation.
- Focus visible.
- Dialog focus trap dan Escape.
- Light/dark theme.
- Privacy mode.

Navigation/API sengaja `NetworkOnly` untuk mencegah cache data finansial. Jika ingin cold-start offline, cache hanya app shell netral tanpa saldo atau transaksi. Jangan mengubah halaman autentikasi atau data finansial menjadi `CacheFirst`.

## Tahap 9 — Vercel

1. Deploy ke Preview dahulu.
2. Masukkan environment variables melalui Project Settings, bukan source.
3. Pastikan Preview tidak memakai database production.
4. Jalankan smoke test dan database test yang aman.
5. Periksa logs agar tidak memuat credential, cookie, gambar struk, atau data finansial lengkap.
6. Promosikan ke Production hanya jika seluruh checklist lulus.

## Tahap 10 — monitoring dan operasional

Konfigurasikan:

- Error monitoring seperti Sentry.
- Uptime monitor `/api/health`.
- Alert database/connection pool.
- Alert lonjakan login gagal dan OCR.
- Backup otomatis TiDB.
- Restore drill berkala.
- Retention policy.
- Incident response.
- Support contact.
- Privacy Policy dan Terms yang telah ditinjau untuk penggunaan nyata.

Gunakan ID operasi dan user ID yang di-hash pada log. Jangan log transaksi atau catatan lengkap.

## Integrasi yang tidak boleh dipalsukan

Fitur berikut membutuhkan provider/infrastruktur terpisah dan harus dikerjakan hanya jika benar-benar dikonfigurasi serta diuji:

- Forgot/reset password melalui email.
- Verifikasi email.
- Passkey atau TOTP/2FA.
- Google OAuth account linking.
- Push notification.
- Cron transaksi rutin otomatis yang idempotent.
- Cold-start offline dengan penyimpanan lokal terenkripsi.

## Output wajib dari Antigravity

Setelah selesai, berikan:

1. Daftar file yang diubah dan alasan setiap perubahan.
2. Hasil typecheck, lint, unit test, database test, build, dan release check.
3. Ringkasan migrasi serta bukti staging berhasil.
4. Bundle report sebelum/sesudah.
5. Lighthouse mobile/desktop untuk route penting.
6. Hasil uji iOS, Android, dan desktop.
7. Temuan keamanan dan mitigasinya.
8. Daftar environment variable tanpa menampilkan nilainya.
9. Daftar keterbatasan yang masih nyata—jangan disembunyikan.
10. ZIP/repository final yang tidak memuat `.env`, `.git`, `.next`, `node_modules`, fixture, cache, atau credential.
11. SHA-256 artefak final.
12. Keputusan jujur: siap Production atau masih Preview-only.

Sasaran akhir bukan sekadar terlihat 10/10, melainkan terbukti cepat, aman, stabil, aksesibel, dan dapat dipulihkan berdasarkan hasil test nyata.

---
