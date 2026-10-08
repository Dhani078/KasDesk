# Changelog

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
