# KasDesk production hardening

Use this checklist before every production release. It keeps the app fast, safe, and clean without changing the current product feel.

## 1. Never ship local artifacts

Do not archive, upload, or share these paths:

```txt
.env
.env.*
*.env
.git/
.next/
node_modules/
.vercel/
```

Share source-only packages instead:

```bash
git archive --format=zip --output kasdesk-source.zip HEAD
```

If a package containing `.env` was ever shared, rotate `AUTH_SECRET`, database password, Google OAuth secret, and `GEMINI_API_KEY`.

## 2. Vercel environment variables

Production values must be set in Vercel, not committed:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST=true`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` when Google login is enabled
- `GEMINI_API_KEY` when OCR is enabled

`AUTH_URL` must match the deployed production URL exactly.

## 3. Performance gates

Before production deploy:

```bash
npm ci
npm run typecheck
npm run lint
npm run build
npm run release:check
```

Then verify:

- Dashboard first load feels instant because route-level skeletons render while server data loads.
- PWA install works on Android Chrome and iOS Safari.
- Offline transaction queue drains once the connection returns.
- Lighthouse mobile Performance, Accessibility, Best Practices, and SEO stay above 90.

## 4. Database health

Keep dashboard and insight queries aggregated in SQL whenever row counts grow. Avoid fetching all rows just to sum values in JavaScript.

Watch these access patterns:

- dashboard totals by `userId` and `isArchived`
- month-to-date transactions by `userId`, `type`, `occurredAt`
- wallet detail by `walletId`, `occurredAt`
- open debts by `userId`, `isPaid`

## 5. Security gates

- Keep secrets only in the deployment secret manager.
- Keep OCR fail-closed when `GEMINI_API_KEY` is absent.
- Keep financial pages/API dynamic and authenticated.
- Move CSP from report-only to enforced only after testing inline script/style compatibility.
- Confirm account export and account deletion flows on staging before release.
