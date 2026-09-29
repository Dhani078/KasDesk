# Antigravity handoff

Jalankan pada environment nyata: `npm ci`, `npm run release:check`, `npm run build`, migrasi `npm run db:push` di TiDB staging, database-backed tests, Lighthouse, dan device test PWA. Rotasi seluruh credential yang pernah dibagikan. Jangan commit `.env.local`.

## Verifikasi upgrade 10/10 terbaru

- **AI Model Upgrade:** OCR dan AI Coach Chat menggunakan seri model Gemini Flash terbaru (`gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`) dengan otomatis *fallback cascade*. Tidak lagi menggunakan Gemini 2.5 Flash.
- **AI Coach Chat:** Jalankan `npm run test:coach` untuk memverifikasi autentikasi 401/307, validasi input, dan respons cerdas model dengan konteks metrik finansial real-time.
- **Audit Browser Headless Nyata:** Jalankan `npm run test:browser` (54 uji via Chrome CDP WebSocket): memverifikasi 0 horizontal overflow pada ultra-compact mobile (320x568 iPhone SE), mobile standar (390x844), dan PC desktop (1280x800).
- **Timezone Makassar (UTC+8):** Jalankan `npm run test:timezone` untuk memastikan perhitungan batas awal bulan 00:00:00 Makassar tepat hingga satuan detik.
- Pastikan route groups `(public)` dan `(dashboard)` ter-build tanpa konflik URL.
- Jalankan bundle analyzer dan pastikan landing/login tidak memuat offline queue, bottom navigation, atau OCR chunk.
- Pastikan OCR menggunakan distributed quota pada deployment multi-instance.
- Uji pencarian judul, catatan, kategori, dompet, tanggal, serta cursor pagination.
- Uji feedback sukses/gagal dan pencegahan submit ganda pada budget dan pengingat.
- Uji toggle pengingat hanya dapat mengubah data pemiliknya.
- Cold-start offline, email reset, passkey/2FA, cron transaksi rutin, push notification, monitoring eksternal, dan legal review tetap membutuhkan infrastruktur/provider nyata.
