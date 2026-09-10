> # ⚠️ SUPERSEDED — DO NOT USE AS SOURCE OF TRUTH
>
> This document has been **superseded by `PRD.md`** (and its derived specs).
> It is retained only as historical design intent.
>
> **Authoritative documents:**
> - `PRD.md` — what & why (product requirements)
> - `ARCHITECTURE.md` — how (ADRs)
> - `DATABASE-SPEC.md` — schema, RLS, RPC
> - `DESIGN-SYSTEM.md` — visual & interaction
> - `SECURITY-SPEC.md` — threat model & controls
> - `AI-OCR-SPEC.md` — Gemini receipt scanning
> - `QA-STRATEGY.md` — testing, CI/CD, SLOs
> - `conductor/product.md` — machine-readable mirror
>
> Where this file conflicts with `PRD.md`, **`PRD.md` wins**. See `PRD.md` §12
> (Resolved Conflicts) for the specific tie-breaking decisions.
>
> **Product name is now KASDESK** (formerly "Vaultify").
>
> ---

# Vaultify — System Context & Architecture Specification

## 1. Project Overview & Vision
**Vaultify** is a high-density, mobile-first Progressive Web Application (PWA) designed for ultra-fast, zero-friction personal finance management. Engineered with a **Swiss Industrial & Apple Native aesthetic** (*Obsidian Geist Engine*), Vaultify eliminates visual fluff in favor of monospace tabular figures, compact inset grouped lists, ergonomic single-hand touch zones, and rapid 3-second expense logging.

---

## 2. Technology Stack

| Layer | Technology | Key Usage |
| :--- | :--- | :--- |
| **Framework** | **Next.js 14+** (App Router) | Server Components, Server Actions, Route Handlers |
| **Styling** | **Tailwind CSS + CSS Variables** | Custom design tokens, dark mode obsidian palette, custom utilities |
| **State Management** | **Zustand** | Local optimistic updates, UI state, quick action modals |
| **Database & Auth** | **Supabase** | PostgreSQL, Row Level Security (RLS), Auth Providers, Realtime Sync |
| **AI OCR Engine** | **Google Gemini API** | Structured JSON receipt parsing (Indomaret, Alfamart, Warteg, local vendors) |
| **PWA Infrastructure** | `@ducanh2912/next-pwa` | Service Worker registration, offline cache storage, web app manifest |
| **Icons & Visuals** | **Lucide React** | High-precision vector icons |

---

## 3. Design System: Obsidian Geist Engine

### 3.1 Design Principles
1. **High Data Density:** Monospace figures, tight padding, grouped inset table structures (`rounded-2xl bg-neutral-900/80 border border-neutral-800`).
2. **Swiss Industrial Minimalism:** Deep dark obsidian backdrop (`#09090b`), sharp high-contrast text (`#f4f4f5`), neon functional accents (Emerald `#10b981` for income, Crimson `#ef4444` for expense, Amber `#f59e0b` for runway warnings).
3. **Ergonomic Single-Hand Mobile Layout:** Floating action buttons and primary controls anchored within the thumb arc zone (bottom 35% of the viewport).
4. **Optimistic & Instant UI:** zero loading spinners for logging; state updates in <50ms with background Supabase sync.

### 3.2 Design Tokens (Tailwind Config Reference)
```css
:root {
  --bg-obsidian: #09090b;
  --surface-card: #121215;
  --surface-inset: #18181b;
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-active: rgba(255, 255, 255, 0.2);
  --text-primary: #f4f4f5;
  --text-secondary: #a1a1aa;
  --accent-emerald: #10b981;
  --accent-crimson: #f43f5e;
  --accent-amber: #f59e0b;
  --accent-cyan: #06b6d4;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
}
```

---

## 4. Core Feature Modules

### 4.1 Overview Dashboard
- **Total Asset Breakdown:** Real-time balance sum across Cash, Bank Accounts, E-Wallets, and Investment Wallets.
- **Safe Daily Spend Limit Calculator:** Dynamic calculation based on remaining monthly unallocated funds divided by remaining days in the billing cycle.
- **Rapid Logging Bar:** Sticky 3-second quick input (Amount + Category + Wallet) with auto-focus.
- **Grouped Activity Feed:** Date-grouped transaction cards with monospace tabular numbers and swipe-to-delete/edit actions.

### 4.2 Multi-Wallet Asset Management
- Support for multiple account types (Cash, Bank Transfer, E-Wallet e.g. GoPay/OVO/Dana, Crypto/Investments).
- Instant inter-wallet transfers with auto-reconciliation.
- Multi-currency baseline support with real-time net worth calculation.

### 4.3 Target Vaults & Savings Goals
- Goal creation with target amount, deadline date, and visual percentage progress bars.
- "Vault Allocation Lock": Automatic subtraction of vault balances from the "Safe Daily Spend" runway to prevent accidental spending.
- Milestone completion indicators with visual micro-animations.

### 4.4 Debt & Ledger Hub (Split-Bill System)
- **Receivables & Payables:** Track who owes who with status tags (`UNPAID`, `PARTIAL`, `SETTLED`).
- **Split-Bill Calculator:** Even & itemized cost breakdown with tax/service charge percentage calculation.
- **WhatsApp Share Link Generator:** Auto-formatted text generator containing bank account info, split breakdown, and direct payment link.

### 4.5 Financial Insights & Safe Runway Projections
- **Days Remaining Runway:** Dynamic calculation (`Total Available Liquid Cash / Average Daily Burn Rate`).
- **7-Day Spending Flow:** Compact sparkline/bar chart displaying daily expenditure momentum.
- **Top Leakage Alerts:** Auto-detection of recurring micro-transactions and anomalous spending spikes.

### 4.6 Gemini AI Receipt Scanner
- Camera overlay interface with automatic flash & alignment frame.
- High-efficiency OCR prompt returning structured JSON:
  ```json
  {
    "merchant_name": "Indomaret",
    "transaction_date": "2026-08-09",
    "items": [
      { "name": "Kopi Susu 250ml", "qty": 2, "price": 12000 },
      { "name": "Roti Cokelat", "qty": 1, "price": 9000 }
    ],
    "subtotal": 33000,
    "tax_and_fees": 0,
    "total_amount": 33000,
    "detected_category": "Food & Beverage"
  }
  ```
- Auto-fill transaction modal for 1-tap confirmation.

---

## 5. Database Schema (Supabase PostgreSQL)

```sql
-- Profiles / Users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  base_currency TEXT DEFAULT 'IDR',
  daily_spend_target NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets / Accounts
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('CASH', 'BANK', 'E_WALLET', 'INVESTMENT')),
  balance NUMERIC NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('INCOME', 'EXPENSE')),
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
  note TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vaults / Savings Goals
CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  target_date DATE,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Debt / Split Ledger
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  phone_number TEXT,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('I_OWE', 'THEY_OWE')),
  status TEXT CHECK (status IN ('UNPAID', 'PARTIAL', 'SETTLED')) DEFAULT 'UNPAID',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Sample RLS Policy for User Data Isolation
CREATE POLICY "Users access own wallets" ON wallets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
```

---

## 6. Development Workflow & Implementation Steps

1. **Project Initialization:**
   - Next.js 14 App Router, Tailwind CSS, `@ducanh2912/next-pwa` configuration.
2. **Database & Supabase Setup:**
   - Run migrations, configure RLS, and generate TypeScript types.
3. **Design System Tokens:**
   - Setup `tailwind.config.ts` with Obsidian Geist theme tokens and custom utility classes.
4. **State Management & Offline Storage:**
   - Setup Zustand store with optimistic update middleware & IndexedDB persistence.
5. **Component Development:**
   - Build UI components: `TabularNumber`, `InsetGroupCard`, `QuickSpendDrawer`, `SafeRunwayMeter`, `VaultProgressCard`.
6. **Gemini AI Receipt OCR Integration:**
   - Route handler `/api/scan-receipt` consuming `@google/generative-ai`.
7. **PWA Testing & Performance Optimization:**
   - Service worker offline fallback testing and Lighthouse audit.
