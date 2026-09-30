# Changelog

## AI Coach & Gemini Flash Upgrade — 2026-09-29

- Upgraded receipt OCR from legacy Gemini 2.5 Flash to modern Gemini 3.8 Flash with automatic fallback cascade across Gemini 3.7 Flash and 3.6 Flash.
- Added interactive AI Coach Chat (`/api/coach/chat` & `components/CoachChat.tsx`) with user model selector (Gemini 3.8, 3.7, 3.6 Flash), 1-tap quick prompts, and live financial context injection.
- Added direct 1-click access to AI Coach from Home Dashboard (`DailyFocus`) and Financial Reports (`/insights`).
- Expanded Chrome Headless CDP browser audit to 54 automated checks across ultra-compact mobile (320px), standard mobile (390px), and desktop (1280px) viewports with verified zero horizontal overflow.
- Cleaned unused code: removed redundant `ThemeToggle` component and deduplicated server action imports.
- Fixed exact UTC boundary for Asia/Makassar (UTC+8) in `lib/timezone.ts` with dedicated unit test suite.
- Localized OCR receipt validation warnings into clear Indonesian messages in `QuickLogSheet` (mapping technical codes `UNREADABLE_TOTAL`, `LOW_CONFIDENCE`, `OUT_OF_BOUNDS`, `TOTAL_MISMATCH`).
- Added AI Coach route reference to `public/llms.txt` for AI crawler discovery.
- Added transactions cursor pagination and query resilience test suite (`scripts/test-transactions-pagination.js`), validating 30-item paging limit, cursor continuity, and graceful handling of corrupted date/cursor query params.
- Added database schema & composite index integrity test suite (`scripts/test-db-schema-integrity.js`), verifying required tables, hardened columns, and composite indexes (`tx_user_date_idx`, `tx_wallet_date_idx`, `tx_user_client_mutation_uq`, `budgets_user_month_category_uq`).
- Added authenticated data export & zero secret leakage test suite (`scripts/test-export.js`), verifying JSON & CSV endpoints, attachment headers, no-store caching, and guaranteeing zero leakage of passwords, hashes, tokens, or environment credentials.
- Added planning, budget upsert & recurring rules invariant test suite (`scripts/test-planning.js`), verifying duplicate-key budget update, atomic wallet debit on recurring execution, schedule advancement, overdraw guards, and strict ownership scoping.
- Added account lifecycle & session invalidation test suite (`scripts/test-account-lifecycle.js`), verifying password change validation, timestamp-based session revocation via `sessionInvalidBefore`, atomic multi-table cascading account deletion upon typing "HAPUS AKUN", and immediate rejection of deleted user sessions.
- Added keyboard accessibility (Escape key dismissal) to `QuickLogSheet` modal dialog.
- Hardened all interactive sheets and dialogs with Escape key keyboard accessibility (`NewWalletSheet`, `NewDebtSheet`, `MonthlyRecapModal`, `EditTransactionButton`, `VaultsClient`, `DebtsClient`).
- Hardened `PrivacyToggle` and `SettingsAppearance` with functional state updaters to prevent race conditions during rapid state transitions.
- Expanded Chrome Headless CDP browser audit to 59 automated checks, verifying modal Escape dismissal, privacy mode toggle, and desktop light/dark theme switching.
- Added unified database integration test runner (`scripts/test-db-all.js`), executing all 19 database-backed test suites sequentially with automated post-test fixture cleanup.
- Refined public `privacy/page.tsx` and `terms/page.tsx` using unified product design tokens (`page-shell`, `surface-card`, `back-link`).
- Highlighted Gemini 3.8 Flash OCR and AI Coach features on public landing page (`welcome/page.tsx`).
- Enhanced `scripts/validate-release.js` to support target directory validation and provide clear developer feedback during local testing while strictly failing in release mode if secrets exist.


## Final Antigravity handoff — 2026-09-12

- Added a complete production-validation prompt covering build, staging migration, database tests, Lighthouse, devices, Vercel, monitoring, and final artifact requirements.

## 10/10 architecture and UX pass — 2026-09-12

- Split public and authenticated route layouts to avoid shipping dashboard state and offline code to landing/auth pages.
- Lazy-loaded receipt scanning and moved OCR quotas to the distributed limiter.
- Expanded transaction search to title, note, category, wallet, safe dates, and cursor pagination.
- Added timezone-correct month windows, budget totals, recurring-rule toggles, and accessible planning form feedback.
- Corrected stale offline/CSP documentation and added focused regression tests.

## Lightweight performance pass — 2026-09-12

- Removed web-font downloads and switched to high-quality native system fonts.
- Removed unused client code, direct dependencies, and starter assets.
- Added optimized Lucide package imports, response compression, and immutable icon caching.
- Reduced transaction-center database payloads to rendered fields only.
- Replaced duplicated PWA maskable files with shared optimized icon sources.
- Rebuilt the app icon with a compact 128-color palette while retaining smooth edges and premium detail.
- Reduced favicon weight by removing an unnecessary 256px ICO frame.

## UX 10/10 pass — 2026-09-12

- Reworked Transactions, Planning, and Settings with clearer hierarchy, labels, empty states, and responsive layouts.
- Added reusable product UI primitives for forms, buttons, status pills, cards, rows, and headers.
- Removed all 10–11px interface text and guaranteed accessible touch targets.
- Prevented offline status from overlapping quick actions.
- Added contextual active navigation for Transactions, Planning, and Settings.
- Added accessible chart data disclosure and honest demo-data labeling.
- Improved dashboard action grouping, form focus treatment, visual feedback, and mobile spacing.

## Feature Max — 2026-09-12

- Added searchable transaction center with type and date filters.
- Added monthly category budgets with actual-spend progress.
- Added weekly and monthly recurring reminders.
- Added password change with session invalidation.
- Added transaction date and time editing.
- Included budgets and recurring reminders in export and account deletion.
- Added production build to CI and migration 0004 for planning features.

## Ultimate security pass — 2026-09-12

- Added shared TiDB authentication throttling and expired-bucket cleanup.
- Added session revocation checks and account-existence validation.
- Added authenticated data export and permanent account deletion.
- Added privacy/theme settings, health checks, CI, and release validation.
- Prevented service-worker runtime caching of APIs and authenticated navigation.
- Cleared PWA caches and IndexedDB offline operations on logout.
- Disabled unverified Google OAuth until local-account linking receives integration tests.

## Hardened build

- Fixed authentication throttling and registration abuse controls.
- Prevented concurrent overdrafts and locked partial-debt settlement.
- Added offline mutation idempotency and database integrity constraints.
- Corrected vault-aware daily-spend calculation.
- Validated receipt image signatures before OCR.
- Strengthened browser security headers.
- Refined responsive layout, focus states, navigation, and authentication screens.
- Removed local credentials, build output, dependencies, Git metadata, and internal agent/planning artifacts from distribution.
