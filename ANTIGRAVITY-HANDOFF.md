# Antigravity handoff

Jalankan pada environment nyata: `npm ci`, `npm run release:check`, `npm run build`, migrasi `npm run db:push` di TiDB staging, database-backed tests, Lighthouse, dan device test PWA. Rotasi seluruh credential yang pernah dibagikan. Jangan commit `.env.local`.

## Verifikasi upgrade 10/10 terbaru

- Pastikan route groups `(public)` dan `(dashboard)` ter-build tanpa konflik URL.
- Jalankan bundle analyzer dan pastikan landing/login tidak memuat offline queue, bottom navigation, atau OCR chunk.
- Pastikan OCR menggunakan distributed quota pada deployment multi-instance.
- Uji pencarian judul, catatan, kategori, dompet, tanggal, serta cursor pagination.
- Uji batas bulan di timezone `Asia/Makassar`, terutama pukul 00:00 pada hari pertama bulan.
- Uji feedback sukses/gagal dan pencegahan submit ganda pada budget dan pengingat.
- Uji toggle pengingat hanya dapat mengubah data pemiliknya.
- Cold-start offline, email reset, passkey/2FA, cron transaksi rutin, push notification, monitoring eksternal, dan legal review tetap membutuhkan infrastruktur/provider nyata.
