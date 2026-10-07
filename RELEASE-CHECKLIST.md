# Release checklist

- Rotate every credential previously shared outside the secret manager.
- Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:unit` (221 unit checks across 15 suites), `npm run test:coach`, `npm run test:transactions`, `npm run test:browser` (70 browser checks via Chrome CDP), `npm run test:db` (23 database suites including balance-sync), and `npm run release:check`.
- Run production build: `npm run build`.
- Back up TiDB and test migrations 0000–0004 on empty and legacy staging databases.
- Run database isolation, balance, transfer, reversal, debt, budget, recurring reminder, OCR, statement import, balance-sync, export, account deletion, and concurrency tests.
- Verify client-side zero-knowledge encrypted backup (`.kasdesk.enc`) restores cleanly without secret leakage.
- Verify shared throttling, session invalidation, PWA network-only API/navigation rules, and logout cache clearing.
- Test iOS Safari, Android Chrome, desktop installation, offline recovery, accessibility, and Lighthouse.
- Configure monitoring, alerts, support, retention, recovery, and legally reviewed privacy/terms text.
