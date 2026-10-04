# Terms deployment checklist

KASDESK ships an in-app terms page at `/terms` (`app/(public)/terms/page.tsx`, `force-static`) that is a template. Before public launch, replace the template copy with text reviewed by counsel and matching actual operations.

## In-app sections that must match reality

The published page has exactly 3 sections:

1. **Sifat Layanan** — KASDESK is an independent personal finance record-keeping tool, not a bank, lender, or licensed investment adviser. All calculations (Aman Harian, Proyeksi Tabungan, Financial Health Score) are analytical estimates. Add the governing law and the availability/warranty disclaimer your jurisdiction requires.
2. **Keamanan & Tanggung Jawab Akun** — the user is responsible for password and PIN secrecy. The app offers PIN, WebAuthn biometric (`AppLock.tsx`, `lib/app-lock.ts`), and Privacy Mode; state whether you also offer 2FA/passkey today (currently disabled until account-linking integration tests exist).
3. **Pemindaian AI & Verifikasi** — OCR and AI Coach output is assistance only; users must verify amounts before saving. Keep this consistent with `/privacy` section 2 (Fitur AI).

## Identify before launch

- Legal operator entity, support contact, and governing law.
- Service availability policy (the app is a hobby/PWA deployment today, not a bank-grade SLA).
- Account rules: acceptable use, account suspension, and permanent deletion path.
- Reviewed limitation-of-liability language. KASDESK is a record-keeping tool, not a bank or financial adviser.

## Note on AI features

Receipt OCR (`/api/scan-receipt`) and AI Coach (`/api/coach/chat`) call Google Gemini. They fail closed when `GEMINI_API_KEY` is absent (503 `OCR_NOT_CONFIGURED`) and rate-limit per user, but neither is a substitute for the user verifying the parsed nominal.
