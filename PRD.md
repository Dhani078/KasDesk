# KASDESK — Product Requirements Document

**Document Status:** Draft v1.0 (Baseline)
**Last Updated:** 2026-09-09
**Owner:** Product
**Product Name:** KASDESK
**Codebase Path:** `C:\xampp\htdocs\KasDesk`
**Former Internal Codename:** Vaultify (to be fully retired — see §1.6)

---

## 0. Document Control

### 0.1 Purpose

This PRD is the single authoritative specification for KASDESK v1.0. It defines what we
are building, for whom, why it matters, how success is measured, and the exact scope
boundary between v1 and later versions.

This document supersedes all prior specification documents found in the repository
(`CONTEXT.md`, `DESIGN.md`, `DATABASE.md`, `SCHEMAS.md`, `REACTIVITY.md`, `SECURITY.md`,
`GEMINI.md`, `AGENT.md`, `MEMORY.md`) wherever they conflict. Those documents remain
useful as historical design intent, but **this PRD is the tie-breaker**.

### 0.2 Related Documents

| Document | Status | Relationship to this PRD |
| :--- | :--- | :--- |
| `PRD.md` (this file) | **Authoritative** | What & why |
| `ARCHITECTURE.md` | Derived | How the system is built (ADR set) |
| `DESIGN-SYSTEM.md` | Derived | Visual & interaction specification |
| `DATABASE-SPEC.md` | Derived | Schema, transactions, migrations (TiDB/MySQL) |
| `SECURITY-SPEC.md` | Derived | Threat model, controls, compliance |
| `AI-OCR-SPEC.md` | Derived | Gemini receipt scanning feature |
| `QA-STRATEGY.md` | Derived | Test strategy, CI/CD, SLOs |
| `conductor/product.md` | Mirror | Machine-readable product context |
| `conductor/tech-stack.md` | Mirror | Machine-readable stack context |

### 0.3 Audience

- Engineers implementing KASDESK
- AI coding agents operating in this repository
- Designers producing UI against the design system
- Future contributors onboarding to the codebase

### 0.4 Reading Order for AI Agents

Per the `context-driven-development` skill — **read context first, always**:

1. `PRD.md` (this file) — understand what and why
2. `ARCHITECTURE.md` — understand how
3. `DATABASE-SPEC.md` and `DESIGN-SYSTEM.md` — understand constraints
4. Only then write code

### 0.5 Change Policy

- Any change to §3 (Goals), §5 (Scope), or §8 (Success Metrics) requires Product sign-off.
- Any change to §6 (Functional Requirements) must update §5 Scope and, if user-visible, §8.
- Every significant technical decision gets an ADR in `ARCHITECTURE.md` per the
  `architecture-decision-records` skill.
- Context artifacts are versioned alongside code (per `context-driven-development`
  best practice #4: "Commit context changes alongside code changes").

---

## 1. Product Overview

### 1.1 One-Sentence Definition

> **KASDESK is a mobile-first web app for Indonesians to record income and expenses in
> under 3 seconds, and see exactly how much they can safely spend today.**

This sentence is the positioning test from the `before-you-build` skill: if a target user
cannot understand what it is and why it matters in one sentence, positioning has failed.

### 1.2 The Problem

Indonesian consumers manage money across an unusually fragmented set of accounts: cash,
multiple bank accounts (BCA, Mandiri, BNI, BRI), and multiple e-wallets (GoPay, OVO, DANA,
ShopeePay, LinkAja). Friction in existing tools causes abandonment:

| Friction | Consequence |
| :--- | :--- |
| Manual entry takes 30–60 seconds | Users stop logging by day 3 |
| No "safe to spend today" signal | Budget exists in theory, not in behavior |
| Utang-piutang tracked in chat/notes | Forgotten debts, awkward social friction |
| Generic global apps assume bank-only | E-wallet & cash reality unmodeled |
| Heavy, slow, ad-laden interfaces | Abandonment on low-end Android & spotty 4G |

**Core insight:** the failure mode of personal finance apps is not missing features — it is
**logging friction**. The winner is the app that makes recording a transaction so fast it
becomes a reflex.

### 1.3 The Solution

KASDESK is built on four pillars, directly mirroring the domain model already present in
`lib/schemas.ts`:

```
                        KASDESK
                            │
    ┌───────────┬───────────┼───────────┬────────────┐
    │           │           │           │            │
  ARUS KAS    DOMPET     TARGET      UTANG        WAWASAN
  (Cash Flow) (Wallets)  (Vaults)   (Debts)      (Insights)
    │           │           │           │            │
  income      cash       target      piutang     daily runway
  expense     bank       current     utang       7-day flow
  transfer    e-wallet   due_date    is_paid     leakage alerts
```

| # | Pillar | Domain Evidence in Code | User Promise |
| :-- | :--- | :--- | :--- |
| 1 | **Arus Kas** | `type: income \| expense \| transfer` | "Catat dalam 3 detik" |
| 2 | **Dompet** | `wallets.type: e-wallet \| bank \| cash` | "Semua rekening satu layar" |
| 3 | **Target** | `vaults.target_amount / current_amount` | "Tabungan terlihat maju" |
| 4 | **Utang** | `debts.type: piutang \| utang` | "Tak ada utang terlupa" |
| 5 | **Wawasan** | derived from 1–4 | "Tahu aman belanja hari ini" |

**Note:** the four pillars are not arbitrary product invention — they are reverse-engineered
from the enum values and table structures already committed in `lib/schemas.ts`. The
product definition and the data model are therefore aligned by construction.

### 1.4 Target Users

**Primary — "Andi, the Fragmented Earner"**

| Attribute | Detail |
| :--- | :--- |
| Age | 22–35 |
| Location | Urban Indonesia (Jakarta, Bandung, Surabaya, Yogyakarta) |
| Income | Rp 3–15 juta/bulan, irregular (freelance, commission, gig) |
| Accounts | 1–2 bank + 2–3 e-wallet + cash |
| Device | Mid-range Android (Rp 2–4 juta), Chrome, spotty 4G |
| Behavior | Tried money apps 2–3 times, abandoned each within a week |
| Pain | "Gaji sudah habis tapi saya tidak tahu ke mana" |
| Trigger | Wants to know: *"Boleh nggak saya jajan hari ini?"* |

**Secondary — "Sinta, the Split-Bill Socializer"**

| Attribute | Detail |
| :--- | :--- |
| Context | Actively tracks utang-piutang with friends & family |
| Need | Split bills, remind politely via WhatsApp |
| Pain | Awkward asking friends to pay back; records lost in chat |

**Tertiary — "Budi, the Goal Saver"**

| Attribute | Detail |
| :--- | :--- |
| Context | Saving toward a concrete purchase (laptop, motor, umrah) |
| Need | Visible progress that motivates restraint |
| Pain | Generic budgets don't protect a specific goal |

### 1.5 Platform & Form Factor

| Aspect | Decision |
| :--- | :--- |
| Type | Progressive Web App (PWA), installable |
| Primary viewport | **390 × 844 px** (iPhone 12/13/14 class) |
| Secondary | 360 × 800 px (common Android) |
| Orientation | Portrait-primary (locked in manifest) |
| Interaction | **One-handed, thumb-arc ergonomics** |
| Offline | Must remain usable offline (see FR-OFF) |

**Why PWA, not native:** distribution cost on the Play Store is high and the target user is
install-averse. A PWA is reachable by link (WhatsApp share — the dominant Indonesian
distribution channel), installs without store friction, and is updatable instantly.

### 1.6 Naming Decision

**KASDESK** is the official product name. It replaces the internal codename "Vaultify".

Rationale:
- **KAS** (cash/kas) covers all four pillars — cash flow, wallets, savings, debts — not just
  one function. Rejected alternatives were rejected for being too narrow: `BRANKAS` (safe)
  implies *storing* money, which this product does not do; `CATAT` (record) captures only
  pillar 1 and ignores wallets, goals, and debts.
- **DESK** signals a command center, matching the four-tab dashboard structure.
- Matches the codebase directory name `KasDesk`, eliminating the name/folder mismatch that
  currently exists.
- Rejected: `KASKU` (existing app already uses it), `KASAI` (ambiguous pronunciation,
  "-AI" suffix is saturated in 2024–2026 naming and will date poorly).

**Migration requirement (NR-NAME):** all occurrences of "Vaultify" must be replaced with
"KASDESK" across `package.json`, `app/layout.tsx` (metadata), `public/manifest.json`, and
all `.md` documentation. See §11.1.

---

## 2. Pre-Build Risk Review

Per the `before-you-build` skill, a pre-mortem is run *before* implementation. The goal is
not to block building — it is to name the riskiest assumption and delay the scope that
depends on it.

### 2.1 Verdict

**Risk level: MEDIUM.**

Reason: demand for expense tracking in Indonesia is well-established (the category is
proven), so *demand* risk is low. But **retention** risk is high — this category has a
well-documented graveyard of abandoned apps, and our differentiation rests entirely on an
untested behavioral claim (that 3-second logging is achievable *and* habit-forming).

### 2.2 Risk Assessment

| Risk Dimension | Rating | Assessment |
| :--- | :--- | :--- |
| **Demand** | 🟢 Low | Money-tracking need is universal and proven in Indonesia |
| **Positioning** | 🟢 Low | "Catat 3 detik + tahu aman belanja hari ini" is one-sentence clear |
| **Monetization** | 🟡 Medium | Deferred by decision; freemium path unvalidated (see §10) |
| **Retention** | 🔴 **High** | Category graveyard; hinges entirely on the logging-friction claim |
| **Trust** | 🟡 Medium | Financial data → privacy hesitation; mitigated by local data model |
| **Distribution** | 🟡 Medium | PWA is link-shareable (WhatsApp), but no store presence |
| **Feature adoption** | 🟡 Medium | OCR is the flashy feature but may not drive habit |

### 2.3 The Single Riskiest Assumption

> **That a user will still be logging transactions on day 14.**

Everything else is secondary. If this assumption breaks, no feature set rescues the product.

### 2.4 Evidence To Find First (Smallest Useful Signal)

| # | Signal | How | Target |
| :-- | :--- | :--- | :--- |
| 1 | Time-to-log actually achievable | Instrument `t_log` (see §8.2) | p50 ≤ 3s on mid-range Android |
| 2 | D7 return rate | Cohort of first 100 users | ≥ 40% |
| 3 | D14 retention (the real test) | Cohort of first 100 users | ≥ 25% |
| 4 | Logs per active user per week | Product analytics | ≥ 12 |
| 5 | OCR share of total logs | Feature instrumentation | ≥ 15% (validates v1 investment) |

### 2.5 Do Next / Delay

**Do next:** Build the vertical slice that tests the riskiest assumption — the 3-second
logging loop plus the safe-daily-spend number — and instrument `t_log` from day one. Ship
to 20–50 real users before building anything else.

**Delay until evidence improves:**
- ❌ Multi-currency support (no signal in v1 market)
- ❌ Investment/crypto portfolio tracking (different user, different trust bar)
- ❌ Bank aggregation / open-banking sync (regulatory + integration cost, zero v1 signal)
- ❌ Monetization/paywall infrastructure (explicitly deferred by decision, §10)
- ❌ Recurring-transaction automation (only worth it if retention holds past D30)
- ❌ Shared/family accounts (adds permissions complexity before single-user habit is proven)

### 2.6 Product Risk vs Engineering Difficulty

These are explicitly separated (per `before-you-build` guidance):

- **Product risk is HIGH** (will users build a habit?).
- **Engineering difficulty is LOW-to-MEDIUM.** The stack is mainstream (Next.js + TiDB Cloud (MySQL)),
  the four-pillar data model already exists in code, and the UI is a small number of screens.
- **Implication:** engineering speed is *not* the bottleneck. Do not spend engineering
  effort on features that do not de-risk retention. Ship the logging loop, measure, then decide.

---

## 3. Goals & Non-Goals

### 3.1 Product Goals (v1)

| ID | Goal | Success Measure |
| :-- | :--- | :--- |
| **G1** | Make logging a transaction near-effortless | p50 time-to-log ≤ 3s |
| **G2** | Answer "am I safe to spend today?" in one glance | Feature used ≥ 4×/week per active user |
| **G3** | Model Indonesian money reality (bank + e-wallet + cash) | ≥ 90% users create ≥ 2 wallets |
| **G4** | Make utang-piutang impossible to forget | ≥ 1 debt record per 30% of users |
| **G5** | Give saving goals visible momentum | ≥ 40% users create ≥ 1 vault |
| **G6** | Work when the network does not | Core logging works fully offline |

### 3.2 Business Goals (v1)

| ID | Goal | Measure |
| :-- | :--- | :--- |
| **B1** | Prove habit formation before investing further | D14 retention ≥ 25% |
| **B2** | Build a reachable, referable distribution surface | Install-from-link rate ≥ 30% of visitors |
| **B3** | Establish a codebase that is safe to extend | Zero critical security findings at launch |

### 3.3 Non-Goals (Explicitly Out of Scope for v1)

| # | Non-Goal | Reason |
| :-- | :--- | :--- |
| NG1 | Bank aggregation / open-banking sync | Regulatory + integration cost; no v1 signal |
| NG2 | Investment & crypto portfolio tracking | Different user & trust bar |
| NG3 | Multi-currency | Indonesian users are single-currency (IDR) |
| NG4 | Monetization, paywalls, subscriptions | Deferred by product decision (§10) |
| NG5 | Shared / family / multi-user-per-account accounts | Permission complexity pre-habit |
| NG6 | Native iOS/Android apps | PWA chosen for distribution economics |
| NG7 | Budgeting-by-category with rollover | Adds cognitive load; conflicts with "3 seconds" |
| NG8 | Receipt image storage long-term | Privacy + cost; store extracted data only |
| NG9 | Desktop-optimized layout | Explicitly mobile-first single-hand |
| NG10 | Social features / leaderboards | Privacy-inappropriate for financial data |

---

## 4. User Personas & Journeys

### 4.1 Primary Persona — Andi, the Fragmented Earner

> Andi, 27, freelance designer in Bandung. Income arrives irregularly from three clients.
> He has BCA, GoPay, DANA, and cash. Last month he had Rp 4,2 juta on the 1st and Rp 180 rb
> on the 20th, with no idea where it went.

**Mental model:** "I don't need a budget. I need to know if I can buy this coffee."

**Success for Andi:** He opens KASDESK while queueing for coffee. The home screen says
**"AMAN BELANJA HARI INI: Rp 47.000"**. He taps the FAB, types `12000`, picks `[KOPI]`,
taps **SIMPAN**. Two seconds. Back to his day.

### 4.2 Primary Journey — The 3-Second Log (Critical Path)

This is the single most important flow in the product. Every millisecond counts.

```
 [Home]                    [Quick Log Sheet]              [Home]
┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
│ AMAN HARI INI│          │  Rp [12,000    ] │          │ AMAN HARI INI│
│  Rp 47.000   │          │                  │          │  Rp 35.000   │
│              │   ────►  │  [KOPI] [MAKAN]  │  ────►   │              │
│  ●  ○  +  ○  │  tap FAB │  [TRANSPORT]...  │  SIMPAN  │  -12.000 KOPI│
│              │          │                  │          │  (optimistic)│
└──────────────┘          │  Dompet: BCA   ▾ │          └──────────────┘
                          │                  │
                          │  [    SIMPAN   ] │
                          └──────────────────┘
                             keyboard auto-focus
                             numeric keypad
```

**Step-by-step requirements:**

| Step | Requirement | Rationale |
| :-- | :--- | :--- |
| 1 | FAB is in the **thumb arc** (bottom 35% of viewport) | One-handed reach |
| 2 | Sheet opens with **numeric input auto-focused** | No tap needed to start typing |
| 3 | Default wallet pre-selected (last-used) | Removes one decision |
| 4 | Category shown as **one row of chips** | One tap, not a dropdown |
| 5 | `SIMPAN` commits and closes immediately | No confirmation dialog |
| 6 | **Optimistic** — row appears in < 50ms | Perceived instant (§6 FR-LOG-6) |
| 7 | Sync happens in background; failure rolls back | Trust without blocking |

**Anti-patterns explicitly forbidden on this path:**
- ❌ Category as a required dropdown/search
- ❌ "Are you sure?" confirmation
- ❌ Loading spinner before the row appears
- ❌ Note field required
- ❌ Date picker (defaults to *now*, editable behind "lainnya")

### 4.3 Secondary Journey — Split Bill to WhatsApp (Sinta)

Sinta pays Rp 240.000 for dinner with 3 friends. She opens KASDESK → **Utang** →
**Split Bill** → enters total, 4 people, 10% tax/service → KASDESK computes
Rp 66.000/person → she taps **Bagikan via WhatsApp** → a formatted message opens in
WhatsApp with bank details and the per-person amount.

**Why this matters for distribution:** every shared message is an organic acquisition
event. This is the cheapest growth loop available in the Indonesian market.

### 4.4 Tertiary Journey — Goal Momentum (Budi)

Budi wants a MacBook (Rp 24 juta). He creates a vault, allocates Rp 8 juta. Every time he
logs an expense, the "safe daily spend" number has *already* excluded his locked vault
money — so he cannot accidentally spend his laptop fund. Progress bar moves visibly.

---

## 5. Scope

### 5.1 Release Structure

| Release | Theme | Contents | Gate to Exit |
| :--- | :--- | :--- | :--- |
| **R0** | Foundation | Design tokens, routing skeleton, Drizzle/TiDB wiring, Auth.js | Build + typecheck green |
| **R1** | **The Loop** | Quick log, wallet CRUD, transaction list, safe daily spend | p50 `t_log` ≤ 3s measured |
| **R2** | Money Map | Vaults, debts, split-bill, WhatsApp share | 20 users complete journeys |
| **R3** | Intelligence | Insights, 7-day flow, leakage alerts | G2 metric met |
| **R4** | Magic | Gemini OCR scan → auto-fill | OCR accuracy ≥ 90% (§9) |
| **R5** | Polish | PWA install, offline, a11y audit, perf | Lighthouse ≥ 90, WCAG 2.2 AA |

### 5.2 MoSCoW Prioritization (v1)

**MUST have (v1 launch blockers)**
- Email + Google OAuth authentication
- Quick-log transaction (income/expense) ≤ 3s
- Wallet CRUD (cash/bank/e-wallet) with balances
- Transaction list, date-grouped, with edit & delete
- **Safe Daily Spend** calculation on home
- Transfer between wallets
- Vaults (goals) with progress
- Debts (utang/piutang) with status
- Offline-tolerant logging with sync on reconnect
- Mobile-first dark UI per design system

**SHOULD have (v1 if capacity allows)**
- Split-bill calculator + WhatsApp share
- 7-day spending flow (bar chart)
- Gemini OCR receipt scan
- Basic insights (top categories, leakage)

**COULD have (v1 stretch)**
- Recurring transaction templates
- Export to CSV
- Category customization
- Spending anomaly alerts

**WON'T have (v1)** — see §3.3 Non-Goals and §2.5 Delayed scope.

### 5.3 Scope Boundary Table

Ambiguous items are resolved explicitly so implementers never have to guess:

| Item | In v1? | Notes |
| :--- | :--- | :--- |
| Multi-currency | ❌ No | IDR only |
| Recurring transactions | ⚠️ Could | Only if R3 finishes early |
| CSV export | ⚠️ Could | Data portability is a trust lever |
| Dark mode toggle | ❌ No | Dark-only by design (Obsidian Geist) |
| Light theme | ❌ No | Out of scope entirely |
| Biometric app lock | ❌ No | Deferred to v2 |
| Push notifications | ❌ No | PWA; would need service worker + permission |
| Receipt image retention | ❌ No | Extract data, discard image (privacy, NG8) |
| Budget per category | ❌ No | NG7 — conflicts with 3-second goal |
| Multi-user per account | ❌ No | NG5 |

---

## 6. Functional Requirements

### 6.0 Requirement ID Convention

Format: `FR-<AREA>-<n>`
Areas: `AUTH`, `LOG`, `WLT`, `TXN`, `VLT`, `DBT`, `INS`, `OCR`, `OFF`, `PWA`

Each requirement carries a **priority**: `P0` (blocker), `P1` (high), `P2` (medium).

---

### 6.1 AUTH — Authentication & Account

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-AUTH-1 | User can sign up with **email + password** (min 8 chars) | P0 |
| FR-AUTH-2 | User can sign in with **Google OAuth** via Auth.js v5 | P0 |
| FR-AUTH-3 | Session persists across reloads and browser restarts | P0 |
| FR-AUTH-4 | Unauthenticated users are redirected to `/login` | P0 |
| FR-AUTH-5 | Session refresh via **Next.js middleware** (Auth.js v5 JWT) | P0 |
| FR-AUTH-6 | User can sign out, clearing all local state | P0 |
| FR-AUTH-7 | New user gets seeded default data: 1 wallet ("Tunai") + default expense categories | P1 |
| FR-AUTH-8 | Password reset flow via email | P1 |
| FR-AUTH-9 | All routes except `/login`, `/auth/*` require auth | P0 |

> **⚠️ Known defect addressed by FR-AUTH-5:** `lib/supabase/server.ts` has been deleted along
> with the Supabase client; the session helper now lives in `lib/auth/session.ts`, which reads
> the session via Auth.js v5 (`auth()`) and resolves the internal `user_id` from the JWT
> subject. No `middleware.ts` exists in the repo. Without it, sessions will not persist across
> navigation and every protected route reads as unauthenticated. See §11.2.

---

### 6.2 LOG — Quick Logging (Critical Path)

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-LOG-1 | FAB in bottom nav opens **Quick Log bottom sheet** | P0 |
| FR-LOG-2 | Sheet auto-focuses the **amount** field with numeric keyboard | P0 |
| FR-LOG-3 | Amount accepts **IDR formatted input** (`12.000` or `12000` → 12000) | P0 |
| FR-LOG-4 | Amount must be **> 0** (rejects 0 and negatives) | P0 |
| FR-LOG-5 | Category selectable via **single row of chips**; last-used first | P0 |
| FR-LOG-6 | Row appears in list **optimistically within 50ms** | P0 |
| FR-LOG-7 | Wallet defaults to last-used; changeable in one tap | P0 |
| FR-LOG-8 | Date defaults to **now**; editable behind an "advanced" toggle | P1 |
| FR-LOG-9 | Optional note field, max 100 chars, never required | P1 |
| FR-LOG-10 | Save closes the sheet immediately — **no confirmation dialog** | P0 |
| FR-LOG-11 | On sync failure: roll back optimistic row + show non-blocking error | P0 |
| FR-LOG-12 | Type toggle (Pengeluaran / Pemasukan) always visible | P0 |
| FR-LOG-13 | `t_log` (open→saved) instrumented and reported (see §8.2) | P0 |

> **⚠️ Known defect addressed by FR-LOG-4:** current `lib/schemas.ts` declares
> `amount: z.number()` with no `.positive()`, while `SECURITY.md` mandates
> `z.number().positive(...)`. Negative and zero amounts currently pass validation.
> See §11.3.

---

### 6.3 WLT — Wallets

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-WLT-1 | Create wallet: name, type (`cash`/`bank`/`e-wallet`), starting balance | P0 |
| FR-WLT-2 | List all wallets with current balance, **monospace tabular figures** | P0 |
| FR-WLT-3 | Edit wallet name & type | P1 |
| FR-WLT-4 | Archive (soft-delete) wallet; preserve historical transactions | P1 |
| FR-WLT-5 | Balance updates **atomically** on every transaction | P0 |
| FR-WLT-6 | Total net worth = sum of all active wallet balances | P0 |
| FR-WLT-7 | Transfer between wallets creates a `transfer` transaction | P0 |
| FR-WLT-8 | Presets for common Indonesian wallets (GoPay, OVO, DANA, BCA, Mandiri, BNI, BRI) | P2 |

> **⚠️ Known defect addressed by FR-WLT-5:** `lib/actions.ts` explicitly assumes a database
> trigger updates wallet balance ("For now, we will assume a trigger handles the wallet
> balance update") but **no such trigger is defined in `DATABASE.md`**. Balances currently
> never update. Resolved in `DATABASE-SPEC.md` via an atomic RPC function. See §11.4.

---

### 6.4 TXN — Transactions

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-TXN-1 | List transactions **grouped by date** (Hari Ini, Kemarin, then dates) | P0 |
| FR-TXN-2 | Each row shows: category tag `[KOPI]`, title, wallet, time, amount | P0 |
| FR-TXN-3 | Amounts colored by type: income green, expense red, transfer gray | P0 |
| FR-TXN-4 | Edit a transaction (amount, category, note, wallet, date) | P1 |
| FR-TXN-5 | Delete a transaction, reversing the wallet balance | P1 |
| FR-TXN-6 | Infinite scroll / pagination (50 per page) | P1 |
| FR-TXN-7 | Filter by wallet, type, and date range | P2 |
| FR-TXN-8 | Monthly income/expense summary on home | P0 |
| FR-TXN-9 | Editing/deleting **recomputes** wallet balance correctly | P0 |

**Category tag rendering per the design system:** raw monospace text in brackets —
`[KOPI]`, `[MAKAN]`, `[XFER]`, `[GAJI]` — **never** circular colored icon badges.

---

### 6.5 VLT — Vaults (Savings Goals)

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-VLT-1 | Create vault: title, target amount, optional target date | P0 |
| FR-VLT-2 | Allocate funds into a vault from a wallet | P0 |
| FR-VLT-3 | Progress bar with percentage | P0 |
| FR-VLT-4 | **Vault Allocation Lock:** vault balances are excluded from Safe Daily Spend | P0 |
| FR-VLT-5 | Withdraw from vault back to wallet | P1 |
| FR-VLT-6 | Mark vault as complete when target reached | P1 |
| FR-VLT-7 | Vault list with remaining amount & days to target | P2 |

---

### 6.6 DBT — Debts (Utang / Piutang)

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-DBT-1 | Record debt: person name, amount, type (`piutang`/`utang`), optional due date | P0 |
| FR-DBT-2 | List debts split into **Piutang** (they owe me) and **Utang** (I owe) | P0 |
| FR-DBT-3 | Mark as paid / partial payment | P0 |
| FR-DBT-4 | **Split-bill calculator:** total, N people, optional tax/service % | P1 |
| FR-DBT-5 | **WhatsApp share:** generate formatted message with breakdown + bank info | P1 |
| FR-DBT-6 | Optional phone number for WhatsApp deep link | P2 |
| FR-DBT-7 | Settle debt optionally creates a linked transaction | P2 |

---

### 6.7 INS — Insights & Safe Daily Spend

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-INS-1 | **Safe Daily Spend** = (spendable cash − vault allocations − upcoming debts) ÷ days left in cycle | P0 |
| FR-INS-2 | Displayed prominently on home as the hero secondary metric | P0 |
| FR-INS-3 | **Runway:** days remaining at average daily burn rate | P1 |
| FR-INS-4 | **7-day spending flow** — compact vertical bar chart (no pie charts) | P1 |
| FR-INS-5 | Top spending categories this month | P1 |
| FR-INS-6 | Leakage alert: recurring micro-transactions detected | P2 |

**Safe Daily Spend formula (authoritative):**

```
spendable        = Σ(balance of active wallets)
                 − Σ(vault.current_amount)
                 − Σ(unpaid debts due this cycle)
days_left        = days remaining in the current billing cycle (default: calendar month)
safe_daily_spend = max(0, floor(spendable / max(1, days_left)))
```

**Guards:**
- `days_left` is clamped to a minimum of 1 (prevents divide-by-zero at month end)
- Result is clamped to a minimum of 0 (never shows a negative "safe" amount)
- Result is floored to whole rupiah

If `days_left ≤ 0`, fall back to next month's cycle.
If a user has set a cycle start day (v2), use it; v1 uses calendar month.

> This definition is authoritative and matches `DATABASE-SPEC.md` §9.1
> and the unit tests in `QA-STRATEGY.md` §2.3.

---

### 6.8 OCR — Gemini Receipt Scan

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-OCR-1 | Camera capture or gallery upload of a receipt | P1 |
| FR-OCR-2 | Send image to Gemini via server-side route handler | P1 |
| FR-OCR-3 | Parse structured JSON: merchant, items[], total, category guess | P1 |
| FR-OCR-4 | Auto-fill the Quick Log sheet for one-tap confirmation | P1 |
| FR-OCR-5 | Show confidence; low confidence → force manual review | P1 |
| FR-OCR-6 | **Never invent line items** — null when unreadable | P0 |
| FR-OCR-7 | Receipt image is **not persisted** (privacy, NG8) | P0 |
| FR-OCR-8 | Graceful failure: OCR down → manual entry still works | P0 |
| FR-OCR-9 | Rate-limit per user to control cost | P1 |

> **⚠️ Known gap:** `@google/generative-ai` is **not** in `package.json` and
> `/api/scan-receipt` does not exist, though `GeminiOCRResponseSchema` is already defined.
> See §11.5 and `AI-OCR-SPEC.md`.

---

### 6.9 OFF — Offline & Sync

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-OFF-1 | App shell loads offline via service worker | P0 |
| FR-OFF-2 | User can **log transactions offline**; they queue locally | P0 |
| FR-OFF-3 | Queue syncs automatically on reconnect | P0 |
| FR-OFF-4 | Clear offline indicator in UI | P1 |
| FR-OFF-5 | Conflicts resolve last-write-wins with server timestamp | P1 |
| FR-OFF-6 | Queue persisted in IndexedDB (survives reload) | P1 |

---

### 6.10 PWA — Installation & Platform

| ID | Requirement | Priority |
| :-- | :--- | :--- |
| FR-PWA-1 | Valid manifest with **real, existing icon files** | P0 |
| FR-PWA-2 | Installable on Android & iOS (Add to Home Screen) | P0 |
| FR-PWA-3 | Theme color matches canvas `#0D0D0F` | P0 |
| FR-PWA-4 | Safe-area insets respected (see §11.6 — current defect) | P0 |
| FR-PWA-5 | Portrait-primary orientation | P1 |
| FR-PWA-6 | Splash/standalone display mode | P1 |

---

## 7. Non-Functional Requirements

Format: `NR-<AREA>-<n>`

### 7.1 Performance (NR-PERF)

| ID | Requirement | Target |
| :-- | :--- | :--- |
| NR-PERF-1 | Time-to-log (tap FAB → row visible) | **p50 ≤ 3s, p95 ≤ 5s** |
| NR-PERF-2 | Optimistic UI render latency | **< 50ms** |
| NR-PERF-3 | Home screen LCP | ≤ 2.5s on 4G, mid-range Android |
| NR-PERF-4 | Interaction to Next Paint (INP) | ≤ 200ms |
| NR-PERF-5 | Cumulative Layout Shift | ≤ 0.1 |
| NR-PERF-6 | Total JS bundle (first load) | ≤ 250 KB gzipped |
| NR-PERF-7 | Lighthouse Performance (mobile) | ≥ 90 |
| NR-PERF-8 | Server Action round trip | p95 ≤ 400ms |

### 7.2 Usability (NR-USE)

| ID | Requirement |
| :-- | :--- |
| NR-USE-1 | All primary controls reachable one-handed (bottom 35% of viewport) |
| NR-USE-2 | No action requires more than 3 taps from home |
| NR-USE-3 | Every destructive action is undoable or confirmed |
| NR-USE-4 | Empty states explain the next action, never just "No data" |
| NR-USE-5 | Error messages state what happened and what to do |
| NR-USE-6 | Loading states never block the logging path |

### 7.3 Reliability (NR-REL)

| ID | Requirement |
| :-- | :--- |
| NR-REL-1 | Zero data loss on sync failure (queue is durable) |
| NR-REL-2 | Wallet balances are always transaction-derived (no drift) |
| NR-REL-3 | All mutations atomic (transaction + balance update in one RPC) |
| NR-REL-4 | Graceful degradation if TiDB or Gemini is unavailable |
| NR-REL-5 | Uptime SLO 99.5% monthly (see `QA-STRATEGY.md`) |

### 7.4 Security & Privacy (NR-SEC)

| ID | Requirement |
| :-- | :--- |
| NR-SEC-1 | Every query filtered by user_id in the app layer (MySQL has no RLS) |
| NR-SEC-2 | All Server Action inputs validated with **Zod** before DB access |
| NR-SEC-3 | No raw SQL interpolation — Drizzle ORM parameterized queries only |
| NR-SEC-4 | Secrets only via env vars; **never** committed |
| NR-SEC-5 | Receipt images never persisted (FR-OCR-7) |
| NR-SEC-6 | No financial data in logs or analytics payloads |
| NR-SEC-7 | `https` only; secure cookie flags in production |
| NR-SEC-8 | Full data export & account deletion available (data-subject rights) |

### 7.5 Accessibility (NR-A11Y)

| ID | Requirement |
| :-- | :--- |
| NR-A11Y-1 | **WCAG 2.2 Level AA** compliance |
| NR-A11Y-2 | Touch targets ≥ 44 × 44 px |
| NR-A11Y-3 | Text contrast ≥ 4.5:1 (≥ 3:1 for large text) |
| NR-A11Y-4 | Full keyboard navigability |
| NR-A11Y-5 | Screen-reader labels on all icon-only controls |
| NR-A11Y-6 | **User zoom must not be disabled** (see §11.7 — current defect) |
| NR-A11Y-7 | Respect `prefers-reduced-motion` |
| NR-A11Y-8 | Focus visibility on all interactive elements |

### 7.6 Maintainability (NR-MAIN)

| ID | Requirement |
| :-- | :--- |
| NR-MAIN-1 | TypeScript `strict: true`; **`any` is forbidden** |
| NR-MAIN-2 | All DB types derived from the Drizzle schema |
| NR-MAIN-3 | Every architectural decision recorded as an ADR |
| NR-MAIN-4 | Components composed, not prop-proliferated (per `vercel-composition-patterns`) |
| NR-MAIN-5 | ESLint clean; no unused exports or dead code |
| NR-MAIN-6 | Context docs versioned with code |

### 7.7 Naming Consistency (NR-NAME)

| ID | Requirement |
| :-- | :--- |
| NR-NAME-1 | Product displayed as **KASDESK** in all UI, metadata, manifest |
| NR-NAME-2 | Package name in `package.json` is `kasdesk` |
| NR-NAME-3 | Zero occurrences of "Vaultify" in user-facing strings |
| NR-NAME-4 | All documentation uses KASDESK consistently |
| NR-NAME-5 | Directory stays `KasDesk` (no rename needed — now consistent) |

---

## 8. Success Metrics

### 8.1 North Star Metric

> **Weekly Logged Transactions per Active User (WLTAU)**

**Why this, and not DAU:** DAU can be inflated by people opening the app and leaving.
WLTAU only moves when the *core behavior* — recording money — actually happens. It is the
metric closest to whether KASDESK is working.

**Target:** ≥ 12 logs per weekly active user.

### 8.2 Metric Framework (AARRR-aligned)

Using the `startup-metrics-framework` discipline: define, instrument, and set a target for
each stage.

**Acquisition**

| Metric | Definition | Target |
| :--- | :--- | :--- |
| New signups / week | Accounts created | track |
| Install-from-link rate | PWA installs ÷ unique visitors | ≥ 30% |
| WhatsApp share rate | Split-bill shares ÷ debts created | ≥ 40% |

**Activation**

| Metric | Definition | Target |
| :--- | :--- | :--- |
| `t_log` p50 | Median open→saved duration | **≤ 3s** |
| First-log rate | Users logging ≥ 1 txn within 24h | ≥ 70% |
| Setup completion | Users with ≥ 1 wallet + ≥ 1 txn | ≥ 80% |

**Retention** ⭐ *(the riskiest assumption — §2.3)*

| Metric | Definition | Target |
| :--- | :--- | :--- |
| **D1 retention** | Return next day | ≥ 60% |
| **D7 retention** | Return within 7 days | ≥ 40% |
| **D14 retention** | Return within 14 days | **≥ 25%** ← make-or-break |
| D30 retention | Return within 30 days | ≥ 15% |

**Revenue** — not applicable in v1 (monetization deferred, §10).

**Referral**

| Metric | Definition | Target |
| :--- | :--- | :--- |
| Shares per user / month | WhatsApp share events | ≥ 1.5 |
| Invite conversion | Signups attributable to a share | track |

### 8.3 Engagement Metrics

| Metric | Definition | Target |
| :--- | :--- | :--- |
| WLTAU (North Star) | Logs per WAU | ≥ 12 |
| Safe-spend views / week | Home metric impressions per user | ≥ 4 |
| Wallets per user | Average created | ≥ 2 |
| Vault creation rate | % users with ≥ 1 vault | ≥ 40% |
| Debt usage rate | % users with ≥ 1 debt | ≥ 30% |
| OCR share of logs | Scanned ÷ total logs | ≥ 15% |

### 8.4 Health Metrics (Guardrails)

These must **not** degrade while optimizing the above:

| Metric | Definition | Threshold |
| :--- | :--- | :--- |
| Sync failure rate | Failed background syncs ÷ attempts | ≤ 1% |
| Optimistic rollback rate | Rollbacks ÷ optimistic writes | ≤ 2% |
| Crash-free sessions | Sessions without JS error | ≥ 99.5% |
| p95 API latency | Server Action duration | ≤ 400ms |
| OCR field accuracy | Correct extracted fields ÷ total | ≥ 90% |
| Lighthouse mobile | Performance score | ≥ 90 |

### 8.5 Instrumentation Requirements

| ID | Requirement |
| :-- | :--- |
| NR-INST-1 | `t_log` measured client-side from FAB tap to optimistic render |
| NR-INST-2 | Every Server Action logs duration + outcome (never payload amounts) |
| NR-INST-3 | Retention cohorts captured from signup date |
| NR-INST-4 | OCR accuracy sampled against a golden set (see `AI-OCR-SPEC.md`) |
| NR-INST-5 | No PII or financial amounts in analytics events (NR-SEC-6) |

---

## 9. AI Receipt Scanning (OCR) — Feature Detail

Per `llm-evaluation` discipline: an AI feature without an eval harness is not shippable.

### 9.1 Scope

Parse Indonesian receipts from: Indomaret, Alfamart, warteg, local vendors, cafés,
and small restaurants. Output structured JSON that auto-fills the Quick Log sheet.

### 9.2 Response Contract

```json
{
  "merchant_name": "INDOMARET",
  "items": [
    { "name": "Kopi Susu 250ml", "price": 12000, "quantity": 2 },
    { "name": "Roti Cokelat",    "price": 9000,  "quantity": 1 }
  ],
  "detected_total": 33000,
  "confidence_score": 0.92,
  "detected_category": "MAKAN"
}
```

> **Note:** This reconciles two conflicting specs previously in the repo.
> `CONTEXT.md` defined one shape; `lib/schemas.ts` `GeminiOCRResponseSchema` defined
> another. **The schema in `lib/schemas.ts` wins** (it matches the code), extended with
> `detected_category` since FR-OCR-3 requires a category guess.

### 9.3 Guardrails (Non-Negotiable)

| ID | Guardrail |
| :-- | :--- |
| G1 | **Never fabricate line items.** Unreadable → empty array + low confidence |
| G2 | Confidence < 0.7 → fields shown but **must** be user-confirmed |
| G3 | Amounts always IDR integers; no decimals |
| G4 | Prompt-injection defense: image content is data, never instructions |
| G5 | Receipt image discarded after extraction (FR-OCR-7 / NG8) |
| G6 | OCR failure never blocks manual entry (FR-OCR-8) |
| G7 | Per-user rate limit (FR-OCR-9) |

### 9.4 Evaluation Harness

| Component | Specification |
| :--- | :--- |
| **Golden set** | ≥ 50 real/synthetic Indonesian receipts, labeled |
| **Failure modes** | wrong total, missing items, wrong merchant, invented items, wrong category |
| **Grader per mode** | field-level exact-match + normalized numeric match |
| **Baseline** | Measured before any prompt change; re-measured after |
| **Judge calibration** | 10 receipts double-graded manually to align automated grader |
| **Ship gate** | Field accuracy ≥ 90% AND hallucination rate ≤ 2% |

### 9.5 Feature Metrics

| Metric | Target |
| :--- | :--- |
| Field-level accuracy | ≥ 90% |
| Total-amount accuracy | ≥ 95% |
| Hallucination (invented item) rate | ≤ 2% |
| Confidence calibration (Brier) | ≤ 0.15 |
| p95 latency | ≤ 6s |
| Cost per receipt | tracked; alert on spike |
| OCR → successful log conversion | ≥ 80% |

---

## 10. Monetization

**Decision: Free for v1. Monetization evaluated later.**

| Aspect | v1 Position |
| :--- | :--- |
| Pricing | Free, no paywall |
| Why | Retention risk (§2.2) is unresolved; charging pre-validation would suppress the signal we need most |
| Revisit trigger | D14 retention ≥ 25% sustained for 4 consecutive weeks |
| Deferred options | Freemium Pro tier · lifetime unlock · local-context pricing |
| Constraint | Do **not** build paywall/billing infrastructure in v1 (NG4) |

**Note on cost:** TiDB Cloud serverless tier + Gemini API have real marginal costs. Instrument
cost-per-active-user from day one (§9.5) so pricing can be modeled from data, not guesses.

---

## 11. Known Defects & Constraints (Inherited from Current Codebase)

This section records verified defects found during codebase audit. Each must be resolved
before the corresponding release ships. Full remediation detail lives in the derived specs.

| # | Defect | Evidence | Blocks | Ref |
| :-- | :--- | :--- | :--- | :--- |
| 11.1 | ~~Product name is "Vaultify" everywhere~~ **FIXED** | Renamed to KASDESK in `package.json`, `layout.tsx`, docs | Done | NR-NAME |
| 11.2 | ~~No `middleware.ts` — sessions won't persist~~ **FIXED** | `middleware.ts` + `auth.edge.ts` now present; session via Auth.js JWT | Done | FR-AUTH-5 |
| 11.3 | ~~`amount: z.number()` lacks `.positive()`~~ **FIXED** — now `.int().positive().max(100_000_000_000)` | `lib/schemas.ts` | Done | FR-LOG-4 |
| 11.4 | ~~Wallet balance never updates~~ **FIXED** — atomic `balance = balance ± amount`; verified 14/14 (income/expense/transfer/delete/overdraw/rollback/int64). **Also fixed a lost-update race** (see §11.16) | `test:balance`, `test:concurrency` | Done | FR-WLT-5 |
| 11.5 | ~~`/api/scan-receipt` missing~~ **PARTIALLY DONE** — built to `AI-OCR-SPEC`: prompt verbatim, Zod contract, confidence gate (<0.7 → confirm), sanity bounds, per-user rate limit, fail-closed without key. **Blocked on `GEMINI_API_KEY`** — upstream untested until a key is supplied | `test:ocr` (6/6 fail-closed) | Blocked | FR-OCR-2 |
| 11.6 | ~~`pb-safe` class is dead~~ **FIXED** — registered as `@utility` in `globals.css` (Tailwind v4) | CSS now emits `env(safe-area-inset-bottom)` | Done | FR-PWA-4 |
| 11.7 | ~~`userScalable: false`, `maximumScale: 1`~~ **FIXED** — removed; zoom enabled | `app/layout.tsx` | Done | NR-A11Y-6 |
| 11.8 | **PWA icons 404** — `public/icons/` doesn't exist | `manifest.json` vs `public/` listing | R5 | FR-PWA-1 |
| 11.9 | ~~3 of 5 nav routes are 404~~ **FIXED** — `/wallets`, `/wallets/[id]`, `/vaults`, `/insights` all render real data | Smoke test 19/19 | Done | §5.1 R1 |
| 11.10 | ~~FAB has no `onClick` handler~~ **FIXED** — `QuickLogSheet` wired to `createTransaction` | `components/QuickLogSheet.tsx` | Done | FR-LOG-1 |
| 11.11 | Zod `GeminiOCRResponseSchema` & `CONTEXT.md` OCR shapes conflict | both files | R4 | §9.2 |
| 11.12 | ~~Data layer unused~~ **FIXED** — `actions.ts` now imported by `app/page.tsx`, `app/wallets/*`, `app/vaults`, `app/insights` | grep across `app/`, `components/` | Done | §5.1 R1 |
| 11.13 | ~~Two conflicting schemas~~ **FIXED** — `CONTEXT.md`/`AGENT.md`/`MEMORY.md` all carry a SUPERSEDED banner; `DATABASE-SPEC.md` is the single source | headers of all three files | Done | §12 |
| 11.14 | ~~`CONTEXT.md`/`MEMORY.md` claim Next.js 14~~ **FIXED** — both marked superseded; §12 stack table states 16.3.0 | headers + `package.json` | Done | §12 |
| 11.15 | ~~`AGENT.md` describes `src/app/`~~ **FIXED** — marked superseded; §12.10 records root `app/` | `AGENT.md` | Done | §12 |
| 11.16 | ~~Home screen data is hardcoded, not from DB~~ **FIXED** — `app/page.tsx` reads `getDashboard`/`getRecentTransactions`/`getWallets` | `test:balance:e2e` (8/8) | Done | §5.1 R1 |
| 11.19 | **Lost-update race in balance mutation** (found during 11.4 work, not previously documented): read-modify-write let concurrent expenses overwrite each other — 10×Rp 1.000 from Rp 10.000 left Rp 8.000 | `scripts/test-concurrency.js` | Done | FR-WLT-5 |
| 11.20 | **Vaults were read-only** — `getVaults` existed but there was no way to create a target or allocate funds, while PRD §6.7 subtracts vault allocations from spendable money. Fixed: `createVault`/`depositToVault`/`withdrawFromVault` move real wallet balance so money is never counted twice | `test:vaults` (13/13) | Done | FR-VLT-2 |
| 11.21 | **No way to correct a mistyped transaction** — `deleteTransaction` existed but no UI called it, so a wrong amount corrupted the balance permanently. Fixed: delete button + confirm dialog on wallet detail | `test:delete` (12/12) | Done | FR-LOG-6 |
| 11.22 | **Self-transfer accepted + stale wallet detail** — transferring a wallet to itself silently succeeded (no money moved, but a row was written); `createTransaction`/`deleteTransaction` also never revalidated `/wallets/[id]`, so the detail page showed stale balances | `test:transfer` (10/10) | Done | FR-TRF-1 |
| 11.17 | Repo has 1 commit; all project work uncommitted | `git status` | R0 | §13 |
| 11.18 | XAMPP/Apache cannot run this app (Node.js, not PHP) | Project location | — | §13 |

### 11.6 Detail — Dead `pb-safe` Class

`components/BottomNav.tsx` uses `pb-safe` to clear the iPhone home indicator. Verified
against build output:

```
$ grep -c "pb-safe" .next/static/css/*.css
0
$ grep -o "env(safe-area[^)]*)" .next/static/css/*.css
(no matches)
```

Tailwind v4 has no `pb-safe` utility and no `env(safe-area-inset-*)` is emitted anywhere.
The class produces **zero** CSS → the bottom nav is clipped on notched iPhones.

**Fix:** define a real utility in `globals.css`:

```css
@utility pb-safe {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
}
```

### 11.7 Detail — Zoom Disabled

```ts
// app/layout.tsx — current
export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,   // ← blocks pinch-zoom
}
```

This violates WCAG 2.2 SC 1.4.4 (Resize Text) and fails NR-A11Y-1.

**Fix:** remove `maximumScale` and `userScalable` entirely.

---

## 12. Resolved Conflicts (Authoritative Decisions)

Where existing documents disagree, **this table is the tie-breaker.**

| # | Conflict | **Decision** | Rationale |
| :-- | :--- | :--- | :--- |
| 12.1 | Product name: Vaultify vs KasDesk | **KASDESK** | §1.6 |
| 12.2 | Wallet enum: `CASH/BANK/E_WALLET/INVESTMENT` vs `cash/bank/e-wallet` | **`cash` / `bank` / `e-wallet`** | Matches code; investment is NG2 |
| 12.3 | `categories` & `profiles` tables in `CONTEXT.md` but absent from `DATABASE.md` | **Categories = v1 (system-seeded + custom). Profiles = deferred to v2** | Categories needed for logging; profiles not needed pre-monetization |
| 12.4 | Debt status: `UNPAID/PARTIAL/SETTLED` vs `is_paid boolean` | **Keep `is_paid boolean` in v1**; add `paid_amount` for partial | Minimal change; supports FR-DBT-3 |
| 12.5 | Transaction fields: `note/transaction_date/receipt_url` vs `title/category_tag` | **`title` + `category_tag` + optional `note`** | Matches code; `receipt_url` excluded (NG8) |
| 12.6 | OCR JSON: `CONTEXT.md` shape vs `GeminiOCRResponseSchema` | **`GeminiOCRResponseSchema`** + `detected_category` | §9.2 |
| 12.7 | Palette: `#09090b` vs `#0D0D0F` | **`#0D0D0F` (DESIGN.md / globals.css)** | Already implemented in code |
| 12.8 | Accents: emerald/crimson vs sage/terracotta | **`#5EBA7D` / `#E05A47` / `#8A92A0`** | Already in `globals.css` |
| 12.9 | Framework version: Next 14 vs Next 16.3.0 | **Next.js 16.3.0 / React 19.2.8** | Actual installed version |
| 12.10 | Directory: `src/app/` vs `app/` | **Root `app/`** | Actual structure |
| 12.11 | Mono font: Geist Mono vs JetBrains Mono | **JetBrains Mono** | Already loaded in `layout.tsx` |
| 12.12 | Authorization: RLS vs app-layer scoping | **App-layer `userId` scoping** | MySQL/TiDB has no RLS — every query MUST filter `userId` from `requireUserId()` |

---

## 13. Technical Context Summary

Current verified state (as of audit) — full detail in `ARCHITECTURE.md`.

| Aspect | Value |
| :--- | :--- |
| Framework | Next.js 16.3.0 (App Router, webpack build) |
| Runtime | React 19.2.8 |
| Language | TypeScript 5, `strict: true` |
| Styling | Tailwind CSS v4 (`@theme inline` in `globals.css`) |
| Backend | TiDB Cloud (MySQL 8.0-compatible) + Drizzle ORM + `mysql2` |
| State | Zustand 5.0.14 (currently unused) |
| Validation | Zod 4.4.3 |
| Icons | lucide-react 1.30.0 |
| PWA | `@ducanh2912/next-pwa` 10.2.9 |
| Build status | ✅ `next build` succeeds; `tsc --noEmit` clean |
| Routes built | `/` and `/_not-found` only |
| Git | 1 commit; all project work uncommitted |

**Runtime note:** the app lives in `C:\xampp\htdocs\KasDesk`, but Apache/XAMPP **cannot**
serve it — this is a Node.js application. Run with `npm run dev` or
`npm run build && npm start`.

---

## 14. Open Questions

| # | Question | Owner | Needed By |
| :-- | :--- | :--- | :--- |
| Q1 | Billing cycle: calendar month, or user-configurable start day? | Product | R1 |
| Q2 | Default category set for Indonesian users — final list? | Product + Design | R1 |
| Q3 | Refetch vs optimistic updates in v1 — is optimistic + `revalidatePath` enough? | Eng | R2 |
| Q4 | WhatsApp share: `wa.me` deep link only, or Web Share API fallback? | Eng | R2 |
| Q5 | Should vaults be backed by real wallet balance segregation or virtual? | Eng + Product | R2 |
| Q6 | Analytics tooling choice given no-financial-data constraint (NR-SEC-6)? | Eng | R1 |
| Q7 | Gemini model selection (cost vs accuracy) — which tier? | Eng | R4 |
| Q8 | Offline queue: IndexedDB directly, or a wrapper library? | Eng | R3 |

---

## 15. Appendix A — Requirement Traceability

Every goal maps to requirements; every requirement traces back to a goal.

| Goal | Requirements | Metric |
| :--- | :--- | :--- |
| G1 — 3-second logging | FR-LOG-1…13, NR-PERF-1/2 | `t_log` p50 ≤ 3s |
| G2 — safe daily spend | FR-INS-1…3, NR-PERF-3 | ≥ 4 views/week |
| G3 — Indonesian money reality | FR-WLT-1…8 | ≥ 90% create ≥ 2 wallets |
| G4 — debts unforgettable | FR-DBT-1…7 | ≥ 30% create ≥ 1 debt |
| G5 — goal momentum | FR-VLT-1…7, FR-INS-4 | ≥ 40% create ≥ 1 vault |
| G6 — offline resilience | FR-OFF-1…6, FR-PWA-1/2 | ≤ 1% sync failure |
| B1 — prove habit | all of the above | D14 ≥ 25% |
| B3 — safe to extend | NR-SEC-1…8, NR-MAIN-1…6 | 0 critical findings |

## 16. Appendix B — Functional Requirement Count

| Area | Count | P0 | P1 | P2 |
| :--- | :--: | :--: | :--: | :--: |
| AUTH | 9 | 6 | 3 | 0 |
| LOG | 13 | 11 | 2 | 0 |
| WLT | 8 | 5 | 2 | 1 |
| TXN | 9 | 5 | 3 | 1 |
| VLT | 7 | 4 | 2 | 1 |
| DBT | 7 | 3 | 2 | 2 |
| INS | 6 | 3 | 2 | 1 |
| OCR | 9 | 3 | 5 | 1 |
| OFF | 6 | 3 | 3 | 0 |
| PWA | 6 | 4 | 2 | 0 |
| **TOTAL** | **80** | **47** | **26** | **7** |

## 17. Appendix C — Glossary

| Term | Meaning |
| :--- | :--- |
| **KAS** | Cash / treasury; the money being tracked |
| **Dompet** | Wallet — a cash, bank, or e-wallet account |
| **Vault / Target** | A savings goal with a target amount |
| **Utang** | Debt the user owes to someone |
| **Piutang** | Money someone owes to the user |
| **Safe Daily Spend** | Amount spendable today without breaking the month |
| **Runway** | Days until money runs out at current burn rate |
| **`t_log`** | Time from opening the log sheet to saved confirmation |
| **WLTAU** | Weekly Logged Transactions per Active User (North Star) |
| **Thumb arc** | Lower 35% of viewport, reachable one-handed |
| **Grouped inset table** | Design pattern: one container, hairline dividers |
| **ADR** | Architecture Decision Record |
| **RLS** | Row Level Security (PostgreSQL / Supabase) — **not available on MySQL/TiDB**; see app-layer scoping |

---

**End of PRD v1.0**
