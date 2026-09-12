# KASDESK production-candidate audit

Date: 2026-09-12
Baseline: `406948d37ab73bf2a7e3843996c54f9123aac730`

## Executive summary

KASDESK already has a strong product surface: authenticated multi-wallet finance tracking, atomic balance updates, transfer handling, vaults, debt partial payments, transaction search, budgets, recurring reminders, export, an installable PWA, offline queueing, security headers, account controls, and a broad regression-script collection.

This audit identified several low-risk release-hardening opportunities: the settings screen links to a missing `/install` route; migration depends on `.env.local` and cannot bootstrap a missing database; health responses are cached; the logger filters sensitive keys but not credential-shaped values; CI lacks dependency review/concurrency cancellation; and PWA installation needs clearer assistive feedback.

## Strengths observed

- Money mutations are generally scoped to the authenticated account and use database transactions.
- Expense/transfer debits use atomic SQL arithmetic and affected-row checks.
- Transaction create supports a client mutation identifier for offline idempotency.
- Transaction center supports bounded search, filters, dates, wallet ownership validation, and cursor pagination.
- Budget and recurring-reminder screens already exist.
- PWA runtime caching keeps API and navigation requests network-only.
- Account settings include password change, export, privacy, legal links, and deletion.
- Existing tests cover account isolation, balances, concurrency, transfer, reversal, archived wallets, OCR limits, logout, offline queueing, and input bounds.

## Findings

| Severity | Finding | Recommendation |
|---|---|---|
| Medium | Settings links to `/install`, but the route is absent. | Add a public install guide and accessible install state. |
| Medium | Migration requires `.env.local` and connects directly to a possibly missing database. | Support deployment env and fresh database bootstrap. |
| Medium | Health responses are cached and can report stale readiness. | Return `no-store` and structured safe logs. |
| Medium | Logger can retain bearer/key-shaped values under innocent field names. | Redact secret-shaped values and cap field length. |
| Medium | CI lacks dependency review and concurrency cancellation. | Add both as blocking PR checks. |
| Low | Release validation is minimal. | Check clean artifacts, PWA metadata, install route, and migration order. |

## Residual release gates

1. Run `npm ci`, `npm run release:check`, and `npm audit --omit=dev --audit-level=high` on a real checkout.
2. Drill empty and cloned-legacy database migrations with backup/restore evidence.
3. Run full database regression suites: isolation, balance, transfer, delete/reversal, edit, concurrency, debt, vault, export, and account deletion.
4. Inspect at approximately 390px and desktop width; run axe/WCAG AA, keyboard-only, 200% zoom, and reduced-motion checks.
5. Test iOS Safari, Android Chrome, and desktop PWA install/update/offline/reconnect.
6. Keep CSP report-only until violations are collected and resolved.
7. Configure uptime alerts, log retention, support contact, incident ownership, backups, and recovery objectives.

## Decision

**Candidate only, not final production approval.** Merge only after GitHub checks pass and the residual gates have evidence.
