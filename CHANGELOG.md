# Changelog

## Tactile Haptic Vibration Engine Across Debts, Wallets, QuickLog & Navigation — 2026-10-19

- Fully integrated native-grade tactile haptic feedback (`lib/haptics.ts`) across all core interaction surfaces in KasDesk (EPIC 8.3):
  - **Debts Surface (`components/DebtsClient.tsx`, `components/debts/*`)**:
    - `hapticTap()` on tab switches (`utang` / `piutang`) and `+ Catat` opener.
    - `hapticTap()` on due date presets (`+7 hari`, `+30 hari`) and partial settlement shortcuts (`50%`, `100%`).
    - `hapticSuccess()` on successful debt registration and full/partial settlements.
    - `hapticWarning()` on form validation constraints and API settlement errors.
    - `hapticDelete()` on debt deletion and cancellation.
    - `hapticSuccess()` / `hapticTap()` in `AiDebtReminderModal.tsx` on copying generated WhatsApp reminders and switching prompt tones (`santun`, `santai`, `tegas`).
  - **Wallets Surface (`components/WalletsClient.tsx`, `components/wallets/*`)**:
    - `hapticTap()` on `Transfer` and `+ Dompet` sheet triggers.
    - `hapticDelete()` on wallet archive/hide actions, `hapticSuccess()` on wallet restoration.
    - `hapticSuccess()` on new wallet creation in `NewWalletSheet.tsx`.
    - `hapticTap()` and `hapticSuccess()` in `SyncWalletModal.tsx` on screenshot OCR balance extraction and ledger balance reconciliation.
  - **QuickLog Surface (`components/quicklog/*`)**:
    - `hapticSuccess()` on instant offline mutation queueing and online transaction saves.
    - `hapticWarning()` on invalid amount, identical wallet transfer, or submission failures.
    - `hapticTap()` on transaction type radio switches (`Keluar` / `Masuk` / `Transfer`), category chip selections, and wallet dropdowns.
    - `hapticTap()` on `Tukar Posisi` (source/target wallet swap) in `TransferWalletsBox.tsx`.
  - **Global Navigation (`components/BottomNav.tsx`)**:
    - `hapticTap()` on bottom navigation tabs (`Home`, `Dompet`, `Riwayat`, `Akun`).
    - `hapticTap()` on the central elevated quick action `Catat` trigger.
- Confirmed zero-regression tactile safety: graceful browser fallback when `navigator.vibrate` is unavailable, maintaining 100/100 Healthy AST score and 0 TypeScript errors.

## Unified Integration Test Runner 35-Suite & Master Unit 413-Check Expansion — 2026-10-18

- Wired `ensureServer()` and `killServer()` into standalone real OCR suite (`scripts/test-ocr-real.js`), with defensive `try/catch` on curl errors and normalized fixture path handling.
- Optimized `scripts/ensure-server.js` lifecycle manager: increased health check timeout to 1500ms and max wait iterations to 80 (40s), guaranteeing robust automated test server initialization across high disk-I/O Windows runs.
- Expanded master offline unit test suite (`npm run test:unit`) from 21 suites (353 checks) to **24 suites (413 checks)** by adding:
  - `scripts/test-archived-unit.ts` (12/12 checks verifying archived wallet balance omission invariants).
  - `scripts/test-input-bounds.ts` (33/33 checks verifying Transaction, Wallet, and Debt Zod schema protection against negative, fractional, and hostile inputs).
  - `scripts/test-offline-queue.ts` (15/15 checks asserting IndexedDB queue persistence, drain ordering, and offline action fallback contracts).
- Integrated `scripts/test-ocr-real.js` (8/8 checks testing Gemini Flash receipt extraction), `scripts/test-coach-chat.js` (12/12 checks testing AI Coach chat API and model cascade), and `scripts/smoke-ui.js` (19/19 checks validating authenticated demo UI screens) into the centralized runner (`scripts/test-db-all.js`), expanding automated database test coverage to **35 suites**.
- Validated end-to-end execution: all 35 database integration suites passing cleanly (35/35) against TiDB Cloud with zero manual server intervention and zero leftover test fixtures.
- Verified 413 unit checks across 24 suites, 0 TypeScript errors, 0 ESLint warnings, 70 headless Chrome browser audit tests, and 100/100 Healthy AST score on `aislop`.

## Unified Integration Test Runner 32-Suite Expansion (Archived Wallets, Cursor Pagination & HTTP Auth) — 2026-10-17

- Wired `ensureServer()` and `killServer()` from `scripts/ensure-server.js` with defensive `try/finally` teardown into:
  - `scripts/smoke-ui.js` (19/19 checks validating authenticated demo UI screens, navigation, Safe Daily Spend, and real total balance).
  - `scripts/test-archived-wallet.js` (6/6 checks verifying ledger invariants and exclusion of archived balances from headline Total Saldo).
  - `scripts/test-auth-http.cjs` (12/12 checks validating CSRF token generation, session cookies, credential sign-in, and unauthorized 307 redirects).
- Integrated `scripts/test-archived-wallet.js`, `scripts/test-transactions-pagination.js` (9/9 checks testing base64url cursor navigation and corrupt query resiliency), and `scripts/test-auth-http.cjs` into the centralized runner (`scripts/test-db-all.js`), expanding automated database test coverage to **32 suites**.
- Validated end-to-end execution: all 32 database integration suites passing cleanly (32/32) against TiDB Cloud with zero manual server intervention and zero leftover test fixtures.
- Verified 353 unit checks across 21 suites, 0 TypeScript errors, 0 ESLint warnings, 70 headless Chrome browser audit tests, and 100/100 Healthy AST score on `aislop`.


## Unified Integration Test Runner 29-Suite Expansion (OCR Limits & Gemini Key Transport) — 2026-10-17

- Wired `ensureServer()` and `killServer()` from `scripts/ensure-server.js` into standalone OCR limits suite (`scripts/test-ocr-limits.js`), ensuring autonomous verification of Content-Length guard placement, 11MB payload rejection (413/503) in <8s, and non-image MIME type refusal (415/503).
- Added both `scripts/test-ocr-limits.js` (7/7 checks) and `scripts/test-key-transport.js` (7/7 checks validating API key header transport and absence of query param key exposure) into the unified database integration runner (`scripts/test-db-all.js`), expanding coverage to 29 suites.
- Validated end-to-end execution: all 29 database integration suites passing cleanly (29/29) against TiDB Cloud with automated Next.js test server lifecycle and zero leftover fixtures.
- Verified 353 unit checks across 21 suites, 0 TypeScript errors, 0 ESLint warnings, 70 headless Chrome browser audit tests, and 100/100 Healthy AST score on `aislop`.


## Unified Integration Test Runner 27-Suite Expansion (Security Headers & Anti-Clickjacking) — 2026-10-17

- Wired `ensureServer()` and `killServer()` into standalone security headers runner (`scripts/test-security-headers.js`), enabling autonomous zero-manual-intervention verification of `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and CSP assertions.
- Added `scripts/test-security-headers.js` into the centralized unified database integration runner (`scripts/test-db-all.js`), expanding automated test coverage to 27 suites.
- Validated end-to-end execution: all 27 database integration suites passing cleanly (27/27) against TiDB Cloud with zero manual server intervention.
- Verified 353 unit checks across 21 suites, 0 TypeScript errors, 0 ESLint warnings, 70 headless Chrome browser audit tests, and 100/100 Healthy AST score on `aislop`.

## Unified Integration Test Runner 26-Suite Expansion (Balance E2E via Server Actions) — 2026-10-17

- Wired `ensureServer()` and `killServer()` into standalone balance end-to-end runner (`scripts/test-balance-e2e.js`), validating HTTP session cookie authentication, live homepage net balance rendering, wallet details, and ownership scoping.
- Added `scripts/test-balance-e2e.js` into the centralized unified database integration runner (`scripts/test-db-all.js`), expanding automated test coverage to 26 suites.
- Validated end-to-end execution: all 26 database integration suites passing cleanly (26/26) against TiDB Cloud with zero manual server intervention.
- Verified 353 unit checks across 21 suites, 0 TypeScript errors, 0 ESLint warnings, 70 headless Chrome browser audit tests, and 100/100 Healthy AST score on `aislop`.

## Unified Integration Test Runner 25-Suite Expansion (Micro-Savings & Round-Up) — 2026-10-17

- Added `scripts/test-micro-savings.js` into the centralized unified database integration runner (`scripts/test-db-all.js`), expanding automated test coverage to 25 suites.
- Added direct shortcut npm script `"test:micro-savings": "npx tsx scripts/test-micro-savings.js"` in `package.json`.
- Validated end-to-end execution: all 25 database integration suites passing cleanly (25/25), verifying spare-change round-up math, Pay Yourself First rules, schema constraints, and atomic multi-table ledger transactions against TiDB Cloud.
- Verified 353 unit checks across 21 suites, 0 TypeScript errors, 0 ESLint warnings, 70 headless Chrome browser audit tests, and 100/100 Healthy AST score on `aislop`.

## Unified Integration Test Runner 24-Suite Expansion — 2026-10-17

- Added `scripts/test-ocr.js` into the centralized unified test runner (`scripts/test-db-all.js`), expanding automated database integration coverage to 24 suites.
- Validated end-to-end execution: all 24 database integration suites passing cleanly (24/24), with automated Next.js server lifecycle on port 3333 and isolated fixture teardown.
- Verified 70 headless Chrome CDP audit checks passing across mobile, compact (320px), and desktop viewports, with 0 horizontal overflow.
- Maintained 100/100 Healthy codebase benchmark on AST quality gate `aislop` (178 files scanned, 0 errors, 0 warnings).

## PWA Scan Shortcut Bridge, Scanner Tactile Haptics & OCR Test Lifecycle — 2026-10-17

- Connected PWA App Shortcut `/?action=scan` in `components/AppShell.tsx` to automatically initialize `QuickLogSheet` and trigger the receipt source selection dialog (`kasdesk:open-scan`).
- Reinforced `components/scanner/SharedReceiptBridge.tsx` to ensure `QuickLogSheet` mounts before forwarding shared images from Web Share Target API.
- Implemented responsive tactile haptic vibration patterns in `components/ScanReceiptButton.tsx`:
  - `hapticTap()` on button activations, camera picker, and gallery selectors.
  - `hapticSuccess()` upon successful AI OCR receipt parsing.
  - `hapticWarning()` on network dropouts, rate-limiting, or file format rejections.
- Integrated automated server lifecycle manager (`ensureServer` and `killServer`) into `scripts/test-ocr.js` with defensive `try/finally` cleanup for isolated test users and image temporary files.
- Verified 6/6 OCR checks passing, 353 unit checks passing across 21 suites, 0 TypeScript errors, and 100/100 Healthy AST score on `aislop`.

## Vault Tactile Haptic Vibration Integration — 2026-10-17

- Integrated `lib/haptics.ts` tactile vibration patterns across Vaults UI (`components/VaultsClient.tsx` & `components/vaults/VaultSheets.tsx`):
  - Subtle `hapticTap()` on quick preset chips (`+50rb`, `+100rb`, `+500rb`, `Pas Target`, `Semua`), `+ Target`, `Setor`, and `Tarik` buttons.
  - Celebratory `hapticSuccess()` upon successful vault creation, deposits, and withdrawals.
  - Alert `hapticWarning()` when target mutations return errors or deletion is blocked by remaining balance.
  - Distinctive `hapticDelete()` confirmation on target deletion.
- Verified 353 unit checks (21 suites), 0 TypeScript errors, 0 ESLint warnings, and 100/100 Healthy AST score on `aislop`.

## Automated Server Lifecycle Across All E2E Integration Test Suites — 2026-10-17

- Wired `ensureServer()` and `killServer()` from `scripts/ensure-server.js` into remaining standalone integration test suites:
  - `scripts/test-transfer.js` (10/10 checks)
  - `scripts/test-delete.js` (12/12 checks)
  - `scripts/test-debts.js` (15/15 checks)
  - `scripts/test-wallet-archive.js` (10/10 checks)
  - `scripts/test-export.js` (23/23 checks)
  - `scripts/test-insights.js` (5/5 checks)
- Hardened variable scoping in `try/finally` cleanup blocks (`test-wallet-archive.js` & `test-insights.js`) to guarantee flawless database teardown even when early assertions encounter failures.
- All standalone and combined test suites now run completely self-sufficiently without requiring separate manual dev server startup.

## Vault Quick Amount Presets & Celengan Indicator Badge — 2026-10-17

- Enhanced `components/VaultsClient.tsx` with dynamic `🪙 Celengan Aktif` indicator badge displaying directly on the target card designated in micro-savings config.
- Refined goal completion badge with celebratory `Sparkles` icon replacing raw SVG spinner.
- Added quick preset amount chips (`+50rb`, `+100rb`, `+500rb`, `Pas Target` / `Semua`) in `MoveSheet` and `NewVaultSheet` (`components/vaults/VaultSheets.tsx`).
- Connected standalone `scripts/test-vaults.js` to `ensure-server.js` lifecycle manager, ensuring zero manual steps when running `npm run test:vaults`.
- Verified 13/13 vault tests passing, 353 unit checks passing, 70 browser CDP audit checks passing, 100/100 Healthy AST score on `aislop`.

## Automated Test Server Lifecycle & MySQL Query Hardening — 2026-10-17

- Created `scripts/ensure-server.js` centralized test server lifecycle manager that checks port 3333 (`/api/health`), automatically starts Next.js in background if offline, and terminates the spawned child process on test completion via `killServer`.
- Wired `ensureServer()` into `scripts/test-db-all.js`, `scripts/test-coach-chat.js`, `scripts/test-transactions-pagination.js`, and `scripts/browser-audit.js`, enabling deterministic zero-manual-intervention execution across all test suites.
- Fixed strict MySQL/TiDB `ONLY_FULL_GROUP_BY` SQL syntax error in `lib/analytics/actions.ts` by grouping directly on `transactions.categoryTag` without table-qualification mismatch.
- Recorded 100/100 Healthy codebase audit benchmark on `aislop` (178 files scanned, 0 errors, 0 warnings).
- All 353 unit checks (21 suites), 23 database integration suites, 70 headless Chrome CDP audit checks, and release checks passing 100%.

## Real-Time Transaction Filter Aggregation & Net Cashflow Strip — 2026-10-11

- Implemented concurrent database aggregation in `app/(dashboard)/transactions/page.tsx` computing filtered `totalIncome`, `totalExpense`, and total matching `count` via native SQL without pagination truncation.
- Added responsive 3-column financial summary strip (`Total Masuk`, `Total Keluar`, `Selisih Net`) on `/transactions` dynamically updated on search, category filter, wallet filter, and date ranges.
- Enhanced transaction counter pill to indicate filtered status (e.g. `12 transaksi terfilter`).
- Added `test:tx-filters` unit test suite (18 checks) expanding master unit tests to 353 checks across 21 suites (100% passing).
- Verified 70 headless Chrome CDP browser audit checks (0 horizontal overflow), 100/100 Healthy on `aislop`, and Next.js production build.


## Month-over-Month Comparison Engine & Category Variance Analysis — 2026-10-11

- Implemented `lib/analytics/comparison.ts` and `getMonthComparison()` in `lib/analytics/actions.ts` calculating month-over-month expenditure deltas, percentage variance, and directional trend flags ('up' | 'down' | 'same').
- Added algorithmic identification of `biggestSpike` (category with highest nominal increase) and `biggestSaving` (category with highest nominal reduction).
- Created `MonthComparisonCard.tsx` on `/insights` displaying total expenditure comparison vs previous period, insight highlight pills, and an expandable category-by-category delta breakdown.
- Added `test:comparison` unit test suite (24 checks) expanding master unit tests to 335 checks across 20 suites (100% passing).
- Verified 70 headless Chrome CDP browser audit tests (0 horizontal overflow), 100/100 Healthy on `aislop`, and Next.js production build.


## Due Recurring Bills 1-Tap Widget & Dashboard Integration — 2026-10-11

- Implemented `getDueRecurringRules()` in `lib/planning/actions.ts` querying active recurring rules where `nextRunAt <= now`.
- Created accessible `DueBillsCard.tsx` on Dashboard home (`/`) displaying due/overdue recurring bills with 1-tap "Catat" execution via Server Action and custom wallet selector. Returns `null` when no bills are due to keep zero visual clutter.
- Enhanced `DailyFocus.tsx` to automatically prioritize alert message and tag `⚠️ {count} tagihan tempo` when due bills are pending.
- Added `test:due-bills` unit test suite (21 checks) expanding master unit tests to 311 checks across 19 suites (100% passing).
- Verified 70 browser audit checks (0 horizontal overflow), 100/100 Healthy on `aislop`, and successful Next.js production build.


## Financial Logging Consistency Streak Tracker & Gamification — 2026-10-11

- Implemented and wired `getUserStreaks()` in `lib/analytics/actions.ts` querying historical transaction timeline.
- Integrated `StreakCard` in `/insights` displaying consecutive active logging streak, motivational milestone messaging, record streak (`best`), and total active calendar days (`totalDays`).
- Added real-time streak badge (`🔥 {streak} hari`) to `DailyFocus` on dashboard home (`/`).
- Added `test:streaks` script and integrated into `npm run test:unit`, expanding master unit tests to 290 checks across 18 suites (100% passing).
- Verified 100/100 Healthy on `aislop`, 0 TypeScript errors, 0 ESLint warnings, 70 browser audit tests (0 horizontal overflow), and successful production build.


- Attained **100 / 100 Healthy** across all 173 codebase files via deterministic AST engine `aislop` (0 errors, 0 warnings).
- Added `.aislop/config.yml` with strict calibrated boundaries and exclusions for build/scratch/test fixtures.
- Integrated GitHub Actions CI quality gate `.github/workflows/aislop.yml` to automatically reject AI slop regressions on PRs.
- Added npm script `"scan:slop": "npx aislop scan"` in `package.json`.
- Verified 100% full release gate: 271 unit checks (17 suites), 23 database integration suites, 70 headless Chrome CDP browser audit tests, 0 TS errors, 0 ESLint warnings.

## Interactive Architecture Maps & Multi-Skill Hardening Verification — 2026-10-08

- Compiled and verified interactive standalone system architecture and workflow diagrams via `archify`:
  - `docs/kasdesk-architecture.html`: interactive full-stack component architecture map (PWA Client, Service Worker, Auth.js, Next.js Server, Gemini AI, TiDB Cloud).
  - `docs/kasdesk-quicklog-workflow.html`: interactive 2-tap transaction, OCR vision prefill, optimistic sub-50ms loop, and atomic TiDB commit workflow diagram.
- Security Audit Hardening (`security-audit`):
  - Verified tenant data isolation across all Drizzle ORM mutations (`where(eq(..., userId))`).
  - Verified distributed brute-force rate limits on `/api/auth` and `/api/scan-receipt`.
  - Confirmed zero secret leakage on JSON/CSV exports and AES-256-GCM zero-knowledge client encryption.
- Design Quality & Anti-Slop Audit (`taste-skill` / `aislop`):
  - Calibrated visual density, dark canvas hierarchy (`#0D0D0F`), monospace tabular numbers, and tactile haptic vibration patterns.
- Verified 100% full release gate: 271 unit checks (17 suites), 23 database integration suites, 70 headless Chrome CDP browser audit tests, 0 TS errors, 0 ESLint warnings.

## AI Slop Elimination & Codebase Quality Hardening (`aislop` Integration) — 2026-10-08

- Audited entire repository with deterministic AST engine `aislop` (scoring 88/100 Healthy on `app/` and `lib/`, 83/100 on `components/`).
- Added `server-only` explicitly to `package.json` dependencies.
- Canonicalized duplicated OCR response type in `lib/schemas.ts` to reference `lib/ocr/contract.ts`.
- Removed redundant parameter coercions (`Number(amount)`) on typed arguments in `lib/actions/debts.ts` and `lib/actions/vaults.ts`.
- Replaced legacy `<a>` navigation tags in `app/(public)/register/page.tsx` and `app/(public)/login/page.tsx` with Next.js `<Link>`.
- Removed intrusive `autoFocus` from `QuickLogAmountSection.tsx` for accessible screen-reader compliance.
- Reformatted one-line files `app/(dashboard)/layout.tsx` and `app/api/health/route.ts` with standard clean structure.
- Removed useless regex escape character in `CoachChat.tsx`.
- Validated signature data buffer in `scripts/test-web-push.js` bringing unit test suite to 271 checks across 17 suites.
- Verified 100% full release gate: 271 unit checks (17 suites), 23 database integration suites, 70 headless Chrome CDP browser audit tests, 0 TS errors, 0 ESLint warnings.

## Modular Architecture Hardening: QuickLogSheet & SplitBillModal Refactoring — 2026-10-08

- Decomposed monolithic UI files to strictly enforce `<300-500 LOC` clean architecture:
  - `components/QuickLogSheet.tsx`: reduced from 636 LOC to 440 LOC by extracting:
    - `components/quicklog/QuickLogAmountSection.tsx` (amount input, inline math live result, calculator bar, and savings badges).
    - `components/quicklog/QuickLogWalletCategoryFields.tsx` (source wallet select and category chips radio group).
    - `components/quicklog/useQuickLogSubmit.ts` (offline queuing, optimistic pending transition, and error handling).
  - `components/splitbill/SplitBillModal.tsx`: reduced from 456 LOC to 290 LOC by extracting:
    - `components/splitbill/SplitBillMembersSection.tsx` (participant tags, addition, and deletion).
    - `components/splitbill/SplitBillItemsSection.tsx` (order line items, per-person allocation, and add-item inputs).
    - `components/splitbill/SplitBillResultsSection.tsx` (individual dues, WhatsApp settlement sharing, and 1-click debt persistence).
- Synchronized structural test suites (`scripts/test-quicklog.js` and `scripts/test-optimistic.js`) to bundle modular subcomponents.
- Verified 100% full release gate: 270 unit checks (17 suites), 23 database integration suites, 70 headless Chrome CDP browser audit tests, 0 TS errors, 0 ESLint warnings.

## Native Web Push Notifications & Web Share Target Integration (EPIC 8.1 & 8.4) — 2026-10-08

- Implemented Web Push Notifications (EPIC 8.4):
  - Zero-dependency RFC 8292 VAPID token generation and RFC 8291 aes128gcm payload encryption in `lib/push/vapid.ts` using Node.js crypto stdlib.
  - Added push subscription database schema `pushSubscriptions` (`drizzle/0007_push_subscriptions.sql`) and Drizzle model (`lib/db/schema.ts`).
  - Added server actions in `lib/push/actions.ts` and automated triggers (H-3 bill reminder, evening logging prompt 20:00, 90% budget warning) in `lib/push/notifications.ts`.
  - Added user settings UI component `PushNotificationToggle.tsx` under `/settings`.
- Implemented Web Share Target API (EPIC 8.1):
  - Configured `share_target` in `public/manifest.json`.
  - Added service worker background handler in `worker/index.ts` storing incoming files in IndexedDB (`lib/scanner/shared-receipt.ts`).
  - Added server fallback route `/share-target` in `app/share-target/route.ts`.
  - Mounted `SharedReceiptBridge.tsx` in `AppShell.tsx` to automatically bridge shared receipts into the OCR scanning pipeline.
- Synchronized Test Suite & Quality Gate:
  - Added `scripts/test-web-push.js` (30 checks) wired into `package.json` (`npm run test:web-push` and `npm run test:unit`).
  - Updated `scripts/test-db-schema-integrity.js` to verify `pushSubscriptions` table and columns (28 checks).
  - Expanded unit test count to 270 checks across 17 suites (`npm run test:unit`).
  - Verified 100% full release gate (`npm run test:full`): 270 unit checks (17 suites), 23 database integration suites, 70 headless Chrome CDP browser audit tests, 0 TS errors, 0 ESLint warnings.

## Database Schema Migration Fix & Test Suite Modular Path Synchronization — 2026-10-08

- Fixed SQL migrations execution on TiDB:
  - `drizzle/0005_multi_currency_and_rates.sql`: separated sequential `ALTER TABLE` statements so newly added columns (`currency`, `exchangeRate`) resolve properly during `AFTER` clause evaluation.
  - `drizzle/0006_shared_spaces.sql`: separated sequential `ALTER TABLE` statements for `spaceId` and `createdByUserId`.
  - Applied migrations 0005 and 0006 cleanly to TiDB via `npm run db:push`.
- Synchronized structural test suites with modular `lib/actions/` architecture:
  - `scripts/test-debt-partial.js`: updated to inspect `lib/actions/debts.ts` directly.
  - `scripts/test-archived-coverage.js`: updated to inspect all submodules under `lib/actions/`.
  - `lib/actions/transactions.ts`: added inline doc comment clarifying `deleteTransaction` reversal exemption for archived wallets.
- Verified 100% passing across the full release gate (`npm run test:full`):
  - 240 unit checks across 16 test suites (`npm run test:unit`)
  - 23 database integration suites (`npm run test:db`)
  - 70 headless Chrome CDP browser audit tests (`npm run test:browser`)
  - Strict TypeScript typecheck (0 errors) and ESLint (0 errors)
  - Release artifact validation (`release:check`)

## Codebase Hardening, Currency BaseAmount Integrity & Modal Accessibility — 2026-10-07

- Fixed Currency BaseAmount & Frozen Rate Integrity across all transaction insertion and update paths:
  - `updateTransaction` (`lib/actions/transactions.ts`): recomputes `baseAmount` and preserves frozen `exchangeRate` when modifying amounts or currencies.
  - Celengan Ledger Entry (`lib/actions/transactions.ts`): correctly applies source wallet currency and base conversion.
  - `reconcileWalletBalance` (`lib/wallets/reconcile.ts`): persists wallet currency, exchange rate, and base amount on balance adjustments; added missing cache revalidation for `/insights`.
  - `executeRecurringAction` (`lib/planning/actions.ts`): persists target wallet currency, exchange rate, and base amount on automated recurring rule debits; added revalidation for `/wallets` and detail views.
  - `importStatementBatchAction` (`lib/importer/actions.ts`): persists wallet currency, exchange rate, and base amount on imported statement batches; added preventive balance overdraft check before batch debit and cache revalidation for `/insights`.
- Added Keyboard Escape Key Dismissal across 10 interactive modals & sheets:
  - `components/navigation/SpaceSwitcher.tsx`
  - `components/planning/AiBudgetModal.tsx`
  - `components/vaults/RoundUpSettingsModal.tsx`
  - `components/vaults/AiVaultPlannerModal.tsx`
  - `components/debts/AiDebtReminderModal.tsx`
  - `components/wallets/SyncWalletModal.tsx`
  - `components/importer/StatementImportModal.tsx`
  - `components/coach/FloatingCoachBubble.tsx`
  - `components/scanner/ScanProgressModal.tsx`
  - `components/WalletsClient.tsx` (Archive confirmation dialog)
- Hardened Error Transparency:
  - `deleteTransaction` (`lib/actions/transactions.ts`): maps database check constraint violation on income deletion to clear user-facing error `INSUFFICIENT_BALANCE` ("Saldo dompet tidak mencukupi untuk membatalkan pemasukan ini").
  - `seedNewUser` (`lib/auth/register.ts`): explicitly sets `currency: 'IDR'` on starter wallet insertion.
- Expanded Automated Test Coverage:
  - `scripts/test-input-bounds.ts`: added currency boundary checks for `WalletSchema` and `TransactionSchema` (33 total checks).
  - `scripts/test-db-schema-integrity.js`: added verification for `exchangeRates`, `sharedSpaces`, `spaceMembers`, and columns `currency`, `baseAmount`, `spaceId`.
- Verified 100% Passing Gate: TypeScript strict typecheck (0 errors), ESLint (0 errors/warnings), unit tests (240/240 passed), and release validation.

## Shared Financial Spaces & Dual-Ledger Mode Rumah Tangga (EPIC 6) — 2026-10-07

- Implemented Shared Spaces RBAC Engine (`lib/spaces.ts`):
  - 3 standard roles with strict permissions: `owner` (create, invite, remove, delete space), `editor` (record & edit transactions, budgets), `viewer` (read-only audit).
  - Attribution generator (`formatAttribution`) creating multi-user transaction audit trail (*"Dicatat oleh Anda"*, *"Dicatat oleh Sarah"*).
  - Zod schemas for space creation (`CreateSpaceSchema`) and member invitations (`AddMemberSchema`).
- Created Database Migration `drizzle/0006_shared_spaces.sql`:
  - `sharedSpaces` table with `ownerUserId`.
  - `spaceMembers` table with composite unique index (`spaceId`, `userId`) and role check constraints (`owner`, `editor`, `viewer`).
  - Added `spaceId` column to `wallets` table.
  - Added `spaceId` and `createdByUserId` columns to `transactions` table.
  - Updated Drizzle ORM schema definitions in `lib/db/schema.ts`.
- Server Actions & UI Navigation:
  - Created server actions (`lib/spaces/actions.ts`): `getSharedSpaces`, `createSharedSpace`, `addSpaceMember`, and `deleteSharedSpace`.
  - Built interactive workspace switcher (`components/navigation/SpaceSwitcher.tsx`) with modal for creating new shared spaces.
  - Mounted `SpaceSwitcher` directly in the dashboard header on `/` (`app/(dashboard)/page.tsx`).
- Authored automated test suite `scripts/test-shared-spaces.js` (19 checks), wired into `package.json` (`npm run test:shared-spaces` and `npm run test:unit`).
- Synchronized all repository documentation (`CONTRIBUTING.md`, `RELEASE-CHECKLIST.md`, `README.md`, `ANTIGRAVITY-HANDOFF.md`, `PRD.md`) to 240 unit checks across 16 suites.

## Multi-Currency, Forex, Emas & Crypto Net Worth Rollup (EPIC 1) — 2026-10-07

- Implemented Multi-Currency Engine (`lib/currency.ts`):
  - Supports 10 distinct currencies & asset classes: IDR, USD, SGD, EUR, JPY, MYR, XAU (Emas Antam Gram), USDT, BTC, and ETH.
  - Native decimal precision & symbol formatting (`formatCurrency`) with proper negative sign positioning.
  - Reference exchange rates table and conversion utilities (`convertToBase`, `convertFromBase`) with custom rate override support.
  - Consolidated Net Worth Rollup algorithm (`calculateNetWorth`) partitioning assets into 4 classes (Kas IDR, Valas Forex, Emas Fisik, Crypto) with percentage allocations.
- Created Database Migration `drizzle/0005_multi_currency_and_rates.sql`:
  - Added `currency` column to `wallets` table.
  - Added `currency`, `exchangeRate`, and `baseAmount` columns to `transactions` table.
  - Created `exchangeRates` reference cache table with composite unique index (`fromCurrency`, `toCurrency`).
  - Updated Drizzle ORM schema definitions in `lib/db/schema.ts` and Zod validation in `lib/schemas.ts`.
- Integrated Server Actions & UI Components:
  - Updated `createWallet` in `lib/actions/wallets.ts` and `createTransaction` in `lib/actions/transactions.ts` to persist currency and frozen exchange rates.
  - Added currency selector dropdown to `NewWalletSheet.tsx`.
  - Built interactive `NetWorthCard.tsx` and mounted in `WalletsClient.tsx`, displaying total consolidated net worth and asset class allocations.
  - Rendered currency badge and Rupiah equivalent preview for non-IDR wallet rows.
- Authored automated test suite `scripts/test-multi-currency.js` (27 checks), wired into `package.json` (`npm run test:multi-currency` and `npm run test:unit`).
- Synchronized all repository documentation (`CONTRIBUTING.md`, `RELEASE-CHECKLIST.md`, `README.md`, `ANTIGRAVITY-HANDOFF.md`, `PRD.md`) to 221 unit checks across 15 suites.

## Native PWA Superpowers (EPIC 8) & Amplop Digital ZBB 50/30/20 (EPIC 5.1) — 2026-10-07

- Implemented Native PWA Tactile Haptic Vibration Engine (`lib/haptics.ts`):
  - Subtle feedback patterns for `hapticTap` (10ms), `hapticSuccess` (15/40/20ms), `hapticWarning` (30/60/30ms), and `hapticDelete` (40/80/50ms).
  - Integrated into calculator quick buttons, transaction save actions, and destructive deletion confirmations with zero-exception fallback.
- Added PWA App Shortcuts & Action Listener:
  - Configured deep shortcuts in `public/manifest.json`: Catat Cepat (`/?action=quicklog`), Scan Struk AI (`/?action=scan`), Dompet, dan Laporan.
  - Wired URL action listener into `components/AppShell.tsx` to automatically trigger QuickLog and scan dialogs from OS home screen long-press.
- Implemented Digital Envelopes & Zero-Based Budgeting (ZBB 50/30/20, EPIC 5.1):
  - Pure calculation engine (`lib/planning/digital-envelopes.ts`) enforcing zero-unassigned revenue allocation across Needs (50%), Wants (30%), and Savings (20%).
  - Real-time burn-rate tracking, overspending detection, and interactive visual cards (`components/planning/DigitalEnvelopesCard.tsx`) mounted in `/planning`.
  - Authored automated test suite `scripts/test-digital-envelopes.js` (21 checks), wired into `package.json` (`npm run test:digital-envelopes` and `npm run test:unit`).
- Synchronized all repository documentation (`CONTRIBUTING.md`, `RELEASE-CHECKLIST.md`, `README.md`, `ANTIGRAVITY-HANDOFF.md`, `PRD.md`) to 194 unit checks across 14 suites.

## Codebase Audit, Modular Architecture Refactor & Markdown Documentation Sync — 2026-10-07

- Modularized god-file `lib/actions.ts` (984 LOC) into focused domain submodules (`lib/actions/`):
  - `transactions.ts` (419 LOC): `createTransaction`, `deleteTransaction`, `updateTransaction`, `getRecentTransactions`.
  - `wallets.ts` (115 LOC): `getWallets`, `getWalletsIncludingArchived`, `createWallet`, `archiveWallet`, `getCategories`.
  - `vaults.ts` (233 LOC): `getVaults`, `createVault`, `depositToVault`, `withdrawFromVault`, `deleteVault`.
  - `debts.ts` (125 LOC): `getDebts`, `createDebt`, `settleDebt`, `deleteDebt`.
  - `dashboard.ts` (19 LOC): query wrappers `getDashboard`, `getSpendingFlow`, `getTopCategories`.
  - `index.ts` & `lib/actions.ts`: 100% backward-compatible re-export barrel with 0 signature breakage.
- Modularized `components/QuickLogSheet.tsx`:
  - Extracted drag-and-drop state hook `components/quicklog/useQuickLogDragDrop.ts` (29 LOC).
  - Extracted drag dropzone visual overlay `components/quicklog/QuickLogDropOverlay.tsx` (12 LOC).
  - Extracted saved pop animation `components/quicklog/QuickLogSuccessView.tsx` (12 LOC).
  - Extracted savings badges `components/quicklog/QuickLogSavingsBadges.tsx` (41 LOC).
  - Extracted transaction type selector `components/quicklog/QuickLogTypeSelector.tsx` (31 LOC).
  - Extracted error alert box `components/quicklog/QuickLogErrorAlert.tsx` (25 LOC).
- Cleaned dead code & duplicate imports:
  - Removed unreferenced component `components/VaultProjection.tsx`.
  - Consolidated duplicate `lucide-react` import statement in `components/VaultsClient.tsx`.
- Synchronized all documentation across the repository:
  - Aligned unit test verification numbers to 173 checks across 13 suites in `CONTRIBUTING.md`, `RELEASE-CHECKLIST.md`, `README.md`, and `ANTIGRAVITY-HANDOFF.md`.
  - Aligned TiDB database integration suite counts to 23 in `PRD.md`.
  - Added port 3333 dev server instruction (`npm run dev -- -p 3333`) in `README.md` to match runtime test harnesses.
- Verified 100% test gate passing: TypeScript strict typecheck (0 errors), ESLint (0 warnings), unit tests (173/173 passed), and release validation.

## Micro-Savings "Celengan Pembulatan" & Spare-Change Round-Up (EPIC 5) — 2026-10-07

- Implemented pure mathematical micro-savings calculation engine (`lib/micro-savings.ts`):
  - `calculateRoundUp(amount, step)`: supports spare-change rounding to nearest Rp 1.000, Rp 5.000, or Rp 10.000 with zero remainder overcharges.
  - `calculatePayYourselfFirst(incomeAmount, percentage)`: computes 10-20% auto-allocation for income $\ge \text{Rp } 1.000.000$.
  - Local configuration persistence with custom cross-component change dispatcher (`ROUNDUP_CONFIG_CHANGED_EVENT`).
- Hardened server-side transaction mutation in `createTransaction` (`lib/actions.ts` & `lib/schemas.ts`):
  - Atomic multi-table database transaction: debits `totalDebit = amount + roundUpAmount` from source wallet, increments target vault `currentAmount`, and records an audit ledger entry (`Celengan: <title>`) without double-charging wallet balance.
  - Dynamic cache revalidation of `/vaults`, `/wallets`, `/insights`, and `/`.
- Created interactive `RoundUpSettingsModal` (`components/vaults/RoundUpSettingsModal.tsx`):
  - Toggle switch, step selection pills (Rp 1.000 / Rp 5.000 / Rp 10.000), target vault dropdown with goal projection, and live calculation preview simulator.
  - Mounted trigger button with animated active pulse and status banner in `components/VaultsClient.tsx`.
- Integrated QuickLog Sheet (`components/QuickLogSheet.tsx`):
  - Live round-up calculation chips (amber badge `+Rp X ke Tabungan`) previewed in real-time as users type expense amounts.
  - "Pay Yourself First" suggestion card for incomes $\ge \text{Rp } 1.000.000$ with 1-tap vault allocation.
- Authored test suite `scripts/test-micro-savings.js` with 18 automated checks (pure math, round-up boundaries, edge cases, Pay Yourself First, schema parsing, and atomic DB execution), wired into `package.json` (`npm run test:micro-savings` and `npm run test:unit`).

## Custom Geometric SVG Brandmark & Ultra-Smooth Floating AI Core — 2026-10-06

- Designed custom isometric vector SVG brand logo (`components/KasDeskLogo.tsx`) featuring a faceted hexagonal vault shield in electric cobalt, cyan, and deep indigo with prismic glow and modern typography.
- Replaced plain generic icons across Welcome landing, Login, and Register screens with the responsive vector `KasDeskLogo`.
- Transformed the global floating AI Coach bubble (`components/coach/FloatingCoachBubble.tsx`) into an ultra-smooth floating orb:
  - Added hardware-accelerated fluid float & ambient pulse animations (`animate-float-smooth`, `animate-pulse-glow` in `globals.css`).
  - Added glassmorphic backdrop with custom animated glowing AI core and micro-interaction spring physics (`cubic-bezier(0.16, 1, 0.3, 1)`).

## Global Floating AI Coach Bubble (FAB) — 2026-10-06

- Added a floating AI Coach Chat Bubble (`components/coach/FloatingCoachBubble.tsx`) mounted globally inside `AppShell.tsx` across every dashboard view (Home, Dompet, Transaksi, Laporan, dsb).
- Positioned seamlessly above mobile BottomNav (`bottom-20 right-4 sm:bottom-6 sm:right-6`) featuring a glowing Sparkles action button.
- Tap to open an instant slide-up financial chat drawer supporting conversational transaction logging (*"makan 18rb"*, *"bensin 25k"*), inline wallet selection with `TransactionActionCard`, and live financial context responses.

## Bank Statement & Mutasi Importer Engine (EPIC 4) — 2026-10-06

- Implemented privacy-first local Bank Statement & E-Wallet Mutasi parser (`lib/importer/statement-parser.ts`) supporting BCA (KlikBCA / myBCA), Mandiri Livin, SeaBank, BRImo, and generic CSV/TSV/Notification text.
- Added smart heuristic auto-categorization mapping Indonesian merchants (Indomaret, Alfamart, SPBU Pertamina, PLN, Tokopedia, Shopee, dsb) into KasDesk category tags.
- Built deterministic SHA-256 mutation fingerprinting for automated deduplication against existing transactions.
- Created interactive review & commit modal `StatementImportModal` (`components/importer/StatementImportModal.tsx`) with row selection checkboxes, editable category assignment, live inflow/outflow delta calculations, and atomic batch commit server action (`lib/importer/actions.ts`).
- Mounted `StatementImportModal` on the `/transactions` history dashboard.
- Authored test suite `scripts/test-statement-parser.js` (20 checks), added to `npm run test:unit`.

## Dual-Mode AI Copilot Across All Modules (Manual + AI) — 2026-10-06

- Expanded KasDesk into a complete Dual-Mode architecture where every key financial module provides both traditional manual controls and 1-tap AI assistance:
  1. **Budget & Planning (`/planning`)**:
     - *Manual*: Form tambah batas budget per kategori.
     - *AI Copilot*: `AiBudgetModal` (`lib/planning/ai-budget.ts`) menerapkan formula cerdas 50/30/20 yang disesuaikan dengan histori pengeluaran nyata, lengkap dengan tombol batch apply semua kategori sekaligus.
  2. **Target Tabungan / Brankas (`/vaults`)**:
     - *Manual*: Form input nama & tanggal target biasa.
     - *AI Copilot*: `AiVaultPlannerModal` (`lib/vaults/ai-planner.ts`) menguji kelayakan (*Feasibility Score 0-100*, vonis SANGAT REALISTIS hingga TIDAK REALISTIS), menghitung setoran bulanan/mingguan terhadap surplus arus kas bebas.
  3. **Utang & Piutang (`/debts`)**:
     - *Manual*: Pencatatan utang-piutang & pelunasan standar.
     - *AI Copilot*: `AiDebtReminderModal` (`lib/debts/ai-reminder.ts`) generator draf pesan penagihan WhatsApp otomatis anti-canggung dengan pilihan 3 nada bicara (*santun*, *santai*, *tegas*) dan rekening transfer.
- Authored test suite `scripts/test-dual-mode-ai.js` (12 checks covering 50/30/20 recommendations, vault feasibility ratios, and WhatsApp reminder tones), wired into `npm run test:unit`.

## Conversational AI Transaction Logging, Domain Guardrails & Screenshot Wallet Sync — 2026-10-06

- Implemented conversational NLP transaction parser (`lib/coach/nlp-parser.ts`) supporting natural phrases like "saya makan hari ini 18000", "beli bensin 25k", and "dapat gaji 5jt" into auto-categorized drafts (#MAKAN, #TRANSPORT, #GAJI).
- Added interactive `TransactionActionCard` directly inside AI Coach chat bubbles allowing 1-tap saving to a user-selected wallet with instant atomic balance updates.
- Enforced strict financial domain guardrails in `/api/coach/chat` that politely refuse technical coding/programming requests and steer users back to KasDesk financial management.
- Implemented Vision OCR screenshot balance detection (`/api/wallets/scan-balance`) and atomic reconciliation (`lib/wallets/reconcile.ts` & `components/wallets/SyncWalletModal.tsx`) for m-Banking/e-Wallet apps (BCA, Mandiri, SeaBank, GoPay, ShopeePay, DANA) with `#PENYESUAIAN` audit transaction logging.
- Authored test suites `scripts/test-nlp-parser.js` and `scripts/test-balance-sync.js`, wired into `npm run test:unit` and `npm run test:coach`.

## Predictive Cashflow Forecast & Financial Autopilot — 2026-10-06

- Implemented daily cashflow simulation engine (`lib/analytics/forecast.ts`) projecting balances across 30, 60, and 90-day horizons.
- Combined liquid balance ($S_0$), scheduled recurring inflows and outflows (`recurringRules`), and historical discretionary daily burn rate.
- Added automated 'Tanggal Kritis' & overdraft detection with recommended daily expense reduction targets.
- Created interactive SVG financial curve component (`components/insights/CashflowForecast.tsx`) with zero charting dependencies, complete with real-time "What-If" expense shock simulator.
- Mounted predictive forecast onto the `/insights` analytics dashboard.
- Authored test suite `scripts/test-forecast.js` (12 checks verifying linear decay, scheduled salary spikes, shock deductions, critical date detection, and date monotonicity), integrated into `npm run test:unit`.

## Zero-Knowledge Encrypted Backup & Browser Audit Hardening — 2026-10-06

- Implemented client-side zero-knowledge encrypted backup (`lib/crypto/backup.ts` & `components/backup/EncryptedBackupModal.tsx`) using native Web Crypto API (`AES-256-GCM` with 100,000 PBKDF2 iterations and random 16-byte salt/12-byte IV) producing `.kasdesk.enc` files.
- Added client-side inspection and verification modal in `/settings` allowing users to decrypt and inspect wallet/transaction counts before restoring.
- Created dedicated test suite `scripts/test-encrypted-backup.js` (12 checks covering short passphrase rejection, armored JSON integrity, AES-256-GCM cipher spec, roundtrip decryption, wrong passphrase rejection, and tamper detection), wired into `npm run test:unit`.
- Hardened `scripts/browser-audit.js` with initial `Network.clearBrowserCookies` and streaming loading skeleton detection (`aria-busy`), preventing stale session collisions across test runs.

## Smart Split-Bill & WhatsApp Settlement Engine — 2026-10-06

- Implemented Smart Split-Bill engine (`lib/split-bill.ts` & `components/splitbill/SplitBillModal.tsx`) for restaurant/group outing expense sharing.
- Built proportional tax (PB1 10%/11%), service charge, and voucher discount allocation algorithm guaranteeing 0 Rupiah discrepancy (`sum(memberDue) === grandTotal`).
- Added 1-click WhatsApp bill message generator (`wa.me/?text=...`) and clipboard copying per participant.
- Integrated direct 1-click "Simpan sebagai Piutang" button into KasDesk's `debts` table for participants with outstanding shares.
- Created dedicated test suite `scripts/test-split-bill.js` (16 checks covering empty lists, proportional tax math, shared items, rounding reconciliation, and WhatsApp template generation), wired into `npm run test:unit`.
- Wired Split-Bill modal trigger into `app/(dashboard)/debts/page.tsx`.

## Freelancer Tax Simulator & Emergency Fund Runway — 2026-10-06

- Implemented Indonesian personal income tax simulator (`lib/tax.ts` & `components/coach/TaxEstimatorModal.tsx`) for freelancers/creators/contractors under the official DJP Norma Penghitungan Penghasilan Neto (NPPN PER-17/PJ/2015) and progressive brackets (UU HPP Pasal 17).
- Added 1-click consultation bridge from tax calculation into AI Coach chat via custom prompt injection.
- Added Emergency Fund Runway & Survival Index (`components/insights/RunwayMeter.tsx`) to `/insights`, calculating liquid burn rate and survival timeline (0 to 12+ months) with visual status indicators.
- Created dedicated test suite `scripts/test-tax.js` (11 checks covering zero income, PTKP deductions TK/0 through K/3, progressive brackets, and monthly reserve precision), wired into `npm run test:unit`.
- Cleaned unused icon imports and validated zero ESLint warnings and zero TypeScript errors.

## OCR Resilience & Error Transparency — 2026-10-06

- Fixed OCR failure caused by upstream Gemini 3.8/3.7 demand spikes (503) by expanding automatic cascade across `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, and `gemini-2.5-flash`.
- Hardened MIME detection via binary magic byte signature matching, resolving browser MIME mismatches (`image/jpg`, `application/octet-stream`, `image/heic`).
- Prevented OCR rejection on discount rows by sanitizing line items instead of throwing 502 `OCR_INVALID_RESPONSE`.
- Enhanced `lib/ocr/image-utils.ts` client-side downscaling with canvas-to-JPEG conversion and HTMLImageElement fallback.
- Added visible top-level error banner and specific server error message propagation in `QuickLogSheet` and `ScanReceiptButton`.
- Verified full test gate: `npm run test:full` and `npm run test:ocr-real` passed with 100% success.

## UX Optimization & Transfer Shortcuts — 2026-10-05

- Added instant 1-tap transfer action in `DashboardQuickActions` and `WalletsClient`, dispatching custom event with `initialType: 'transfer'` directly to `QuickLogSheet`.
- Unified layout styling in `app/(dashboard)/wallets/[id]/page.tsx` with standard `page-shell max-w-3xl` and accessible `back-link`.
- Enabled dynamic wallet selection for `executeRecurringAction` in `app/(dashboard)/planning/page.tsx` when user owns multiple active wallets.
- Added keyboard Escape dismissal accessibility to `DeleteTransactionButton` confirmation modal and `AppLockSettings` PIN dialogs.
- Verified 70 automated browser checks across 320px/390px/1280px viewports (0 horizontal overflow), 22 TiDB suites, AI Coach cascade, and release checks (`npm run test:full` PASS).

## PRD v2.0 & v3.0 Master Architecture Specification — 2026-10-04

- Authored comprehensive Product Requirement Document (`PRD.md`) defining the next-generation Personal Wealth Operating System & Financial Autopilot roadmap.
- Specified 9 flagship epics: Multi-Currency & Crypto Net Worth Rollup, Smart Split-Bill & WhatsApp Settlement Engine, Predictive Cashflow Forecast & Personal Runway, Zero-Credential Bank/E-Wallet Statement Importer, Digital Envelopes (ZBB) & Micro-Savings Auto-Rules, Shared Financial Spaces (Household Mode), AI Coach v2 with Indonesian PPh 21 Freelancer Tax Simulator, Native PWA Superpowers (Web Push, Share Target), and Client-Side Zero-Knowledge Encrypted Backup (`AES-256-GCM`).
- Outlined Drizzle ORM migrations `0005` through `0008` (TiDB MySQL 8 schemas, composite indexes, CHECK constraints, and foreign key cascades).
- Defined modular component architecture enforcing strict `<300-500 LOC` boundaries and 4-phase execution roadmap for autonomous AI coding agents.

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
- Added unified database integration test runner (`scripts/test-db-all.js`), executing all 22 database-backed test suites sequentially with automated post-test fixture cleanup.
- Refined public `privacy/page.tsx` and `terms/page.tsx` using unified product design tokens (`page-shell`, `surface-card`, `back-link`).
- Highlighted Gemini 3.8 Flash OCR and AI Coach features on public landing page (`welcome/page.tsx`).
- Enhanced `scripts/validate-release.js` to support target directory validation and provide clear developer feedback during local testing while strictly failing in release mode if secrets exist.
- Added comprehensive single-command verification runner (`npm run test:full`) bundling unit tests, AI Coach tests, pagination tests, 70 browser checks, all 22 database integration suites, and release validation.
- Patched transitive dependency vulnerabilities via npm overrides (`brace-expansion` ^1.1.21 & ^2.1.7, `fast-uri` ^3.1.8, `js-yaml` ^4.3.2), achieving 0 audit vulnerabilities on production and CI.
- Optimized TiDB connection pool in `lib/db/index.ts` (extended `idleTimeout` to 5 minutes, `keepAliveInitialDelay` to 5s, `connectionLimit: 10`, `connectTimeout: 10s`) to maintain warm TLS sockets and eliminate reconnect latency during user sessions.
- Optimized `BottomNav` wallet prefetch with deferred hydration, preventing initial network contention on page load.
- Added desktop global keyboard shortcut (`c` / `C`) in `AppShell` to instantly launch `QuickLogSheet` from anywhere across the dashboard.
- Added native drag-and-drop receipt image drop-zone and direct clipboard paste (`Ctrl+V` / `Cmd+V`) in `QuickLogSheet` and `ScanReceiptButton` for instant Gemini 3.8 Flash OCR parsing (zero extra dependencies, pure native Web APIs).
- Expanded Chrome Headless CDP browser audit to 61 automated checks, verifying desktop keyboard shortcuts and modal dismissal.
- Hardened `scripts/test-insights.js` category matching for start-of-month date transitions and `scripts/test-coach-chat.js` for flexible casing.
- Added PWA App Shortcut for "Tanya AI Coach" (`/coach`) in `public/manifest.json` for one-tap home-screen access.
- Added desktop keyboard shortcut (`/`) in `TransactionFilter` to instantly focus search without leaving the keyboard.
- Integrated native Web Share API (`navigator.share`) with WhatsApp fallback in `MonthlyRecapModal` for financial recap sharing.
- Expanded Chrome Headless CDP browser audit to 62 automated checks, covering transaction search focus shortcut.
- Added global desktop keyboard shortcut (`P` / `p`) in `AppShell` to instantly toggle Privacy Mode (nominal masking).
- Added global desktop keyboard shortcut (`?`) in `AppShell` opening an accessible Keyboard Shortcuts Cheatsheet modal dialog.
- Added mobile tactile haptic feedback (`navigator.vibrate`) upon successful transaction recording in `QuickLogSheet` (pure native Web API, 0 KB bundle).
- Expanded Chrome Headless CDP browser audit to 65 automated checks, validating privacy mode keyboard shortcut and cheatsheet modal dismissal.
- Added 1-click direct CSV export button on the `/transactions` header, enabling instant transaction data download without navigating to settings.
- Added asset percentage distribution metric (`• X% aset`) to active wallet rows in `WalletsClient`, providing immediate asset allocation clarity.
- Connected `FinancialHealthScoreCard` gamification criteria directly to AI Coach with a 1-click consultation trigger to improve financial tiers.
- Expanded Chrome Headless CDP browser audit to 70 automated checks, covering `/install` PWA route across 320px, 390px, and 1280px viewports with 0 horizontal overflow.
- Hardened Gemini 3.8/3.7/3.6 Flash parts extraction in `coach/chat` and `scan-receipt`, filtering thought artifacts and expanding output budget to 2048 tokens.
- Enforced strict atomic double-scoped ownership check in `deleteTransaction` (`lib/actions.ts`).
- Modularized registration and seed pipeline into `lib/auth/register.ts`, enabling clean decoupled imports without `server-only` bundler requirements.
- Expanded unified database test runner (`scripts/test-db-all.js`) to 22 test suites, incorporating new user seed verification, archived coverage, and concurrency race-condition invariants.
- Fixed `scripts/test-ocr.js` component check and added vector-generated receipt image fixture for reproducible OCR tests.

## Docs & metadata sync — 2026-10-01

- Synced stale counts across all documentation: database suites 19 → 22 (`npm run test:db`), browser audit 54/59 → 70 checks (`npm run test:browser`).
- Corrected `README.md` AI Vision entry from legacy Gemini 2.5 Flash to Gemini 3.8 Flash with 3.7/3.6 fallback cascade.
- Expanded `README.md` testing section with the full gate (`npm run test:full`), `test:browser`, `test:db`, and `release:check`.
- Documented recent features in the `README.md` feature table: desktop keyboard shortcuts (`c` / `/` / `p` / `?`), clipboard paste & drag-and-drop receipt OCR, and mobile haptic feedback.
- Documented the intentional removal of `(dashboard)` route-level `loading.tsx` in `docs/PRODUCTION-HARDENING.md` and `CONTRIBUTING.md` so cross-user isolation 404s are never masked by a loading shell.
- Rewrote `CONTRIBUTING.md` and `SECURITY.md` from one-liners into full quality-gate and security-test-suite runbooks; merged `SECURITY-NOTICE.md` into `SECURITY.md` and deleted the duplicate file.
- Completed the `PROMPT-ANTIGRAVITY.md` Tahap 6 test list (added `test:db`, `test:coach`, `test:transactions`, `test:browser`, `test:newuser-seed`, `test:archived:coverage`, `test:archived:unit`, `test:db-integrity`, `test:export`, `test:planning`, `test:lifecycle`).
- Added `APP_TIME_ZONE` to `.env.example`, `README.md`, and `docs/PRODUCTION-HARDENING.md` Vercel environment list.
- Declared `engines.node >= 22` in `package.json` to match the required runtime.
- Rewrote `PRIVACY.md` and `TERMS.md` from one-liners into deployment checkbooks that mirror the exact 3 in-app sections on `/privacy` and `/terms`, cross-reference the export (`test:export`) and deletion (`test:lifecycle`) verification suites, and list the real subprocessors (TiDB Cloud `ap-southeast-1`, Vercel, Google Gemini).
- Noted the real TiDB region (`ap-southeast-1`) in `.env.example`.


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
