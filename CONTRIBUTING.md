# Contributing

Never commit secrets or production data. Scope every database query by the authenticated user ID, use transactional conditional debits, add regression tests, and never modify an applied migration.

## Standard quality gate

Before opening a change, run the full gate in order:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit        # 270 unit checks: rate limit, QuickLog, tax, split-bill, backup, forecast, nlp, statement, micro-savings, envelopes, multi-currency, spaces, web-push
npm run test:coach       # AI Coach auth + Gemini response + guardrails + conversational draft
npm run test:transactions# cursor pagination + corrupted-query resilience
npm run test:browser     # 70 headless Chrome CDP checks, 320px / 390px / 1280px
npm run test:db          # 23 TiDB-backed suites (isolation, balance, transfer, debts, vaults, concurrency, balance-sync)
npm run release:check    # zero secret leakage + PWA manifest + release validation
npm run build
```

`npm run test:full` bundles steps 2–8 in a single command.

## Database tests

TiDB-backed suites mutate data, so run them only against staging or a disposable fixture database. Clean up afterwards:

```bash
npm run test:cleanup
npm run test:cleanup:fixtures
```

Required invariants for any new data path:

- Akun A tidak dapat membaca atau mengubah data akun B.
- Debit/transfer concurrent tidak membuat saldo negatif.
- `clientMutationId` mencegah transaksi ganda.
- Session lama ditolak setelah ganti password.
- Export tidak memuat password hash, token, cookie, API key, atau secret.

## Do not re-add

- Route-level `loading.tsx` under `(dashboard)` — masking a loading shell hides cross-user isolation 404s. See `docs/PRODUCTION-HARDENING.md`.
- `CacheFirst` caching for authenticated pages or APIs — `NetworkOnly` only.
- Web-font downloads — native system fonts by design.
