# Release checklist

- Rotate every credential previously shared outside the secret manager.
- Run `npm ci`, `npm run release:check`, and a production build.
- Back up TiDB and test migrations 0000–0004 on empty and legacy staging databases.
- Run database isolation, balance, transfer, reversal, debt, budget, recurring reminder, OCR, export, account deletion, and concurrency tests.
- Verify shared throttling, session invalidation, PWA network-only API/navigation rules, and logout cache clearing.
- Test iOS Safari, Android Chrome, desktop installation, offline recovery, accessibility, and Lighthouse.
- Configure monitoring, alerts, support, retention, recovery, and legally reviewed privacy/terms text.
