# Privacy deployment checklist

KASDESK ships an in-app policy at `/privacy` (`app/(public)/privacy/page.tsx`, `force-static`) that is a template. Before public launch, replace the template copy with text reviewed by counsel and matching actual operations.

## In-app sections that must match reality

The published page has exactly 3 sections. Each claim below must be verified before launch:

1. **Penggunaan Data Akun & Transaksi** — claims data (nama, email, password terenkripsi; dompet, mutasi, target tabungan, utang-piutang) is processed only to operate features and never sold to third parties or advertisers. Verify the retention period and the lawful basis for your region.
2. **Fitur AI (Scan Struk & AI Coach)** — claims text and images are processed over TLS via Google Gemini and not stored for public model training. Verify against the current Google Gemini / Google Cloud terms, and state which model series is used (`gemini-3.8-flash` with `gemini-3.7-flash` / `gemini-3.6-flash` fallback today).
3. **Hak Akses & Ekspor Data** — claims a full CSV/JSON export and permanent account deletion are always available. Verify both flows on staging:
   - Export: `npm run test:export` (proves JSON & CSV endpoints work and leak no password hash, token, cookie, API key, or secret).
   - Deletion: `npm run test:lifecycle` (proves typing "HAPUS AKUN" atomically purges the account across all tables and rejects old tokens immediately).

## Identify before launch

- Legal operator entity name and registered address.
- Public contact for privacy requests (email or form).
- Database region and any cross-border transfer path (`DATABASE_HOST` region today: TiDB Cloud `ap-southeast-1`).
- Data retention period for inactive accounts.
- Full subprocessor list, including: TiDB Cloud (database), Vercel (hosting), Google Gemini (OCR + AI Coach when `GEMINI_API_KEY` is set).

## Hard rules

- Do not sell financial data or use it for behavioral advertising.
- Do not ship the app with the template policy presented as final legal text — mark it as a template until reviewed.
- Keep `/privacy` and `/terms` mutually consistent; section 3 above overlaps with `/terms` section 3 (Pemindaian AI & Verifikasi).
