> # ⚠️ SUPERSEDED — DO NOT USE AS SOURCE OF TRUTH
>
> This document has been **superseded by `PRD.md`** (and its derived specs).
> It is retained only as historical design intent.
>
> **Authoritative documents:**
> - `PRD.md` — what & why (product requirements)
> - `ARCHITECTURE.md` — how (ADRs)
> - `DATABASE-SPEC.md` — schema, transactions, migrations (TiDB/MySQL)
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

# MEMORY.md — Project Memory & System Knowledge Base

## 1. Project Context & State Summary
- **Project Name:** Vaultify
- **Description:** High-density, mobile-first Progressive Web Application (PWA) for ultra-fast personal finance tracking. Built with Swiss Industrial & Apple Native aesthetic (*Obsidian Geist Engine*).
- **Current Phase:** Architectural Design & Core Documentation Phase (All specification `.md` files initialized).
- **Target Viewport:** Mobile (`390px x 844px`), single-hand ergonomic navigation.

---

## 2. Master Document Index & File Responsibilities

| File | Purpose & Responsibility |
| :--- | :--- |
| **`CONTEXT.md`** | Master overview, product vision, feature module specs, and high-level workflow. |
| **`DESIGN.md`** | Obsidian Geist Design System tokens (colors `#0D0D0F`/`#161619`, typography, strict anti-AI slop rules). |
| **`AGENT.md`** | Component directory structure (`src/app`, `components/`, `lib/`), coding conventions for AI tools. |
| **`CLAUDE.md`** | CLI environment commands (`npm run dev`, `build`, `lint`, `tsc`), code standards, and pre-commit checks. |
| **`GEMINI.md`** | Execution mindset for Antigravity/Gemini engine (Zero runtime errors, strict typing, zero-SQLi). |
| **`SECURITY.md`** | Hardened security rules (Supabase ORM parameterization, Zod validation layer, RLS policies). |
| **`DATABASE.md`** | DDL SQL scripts for Supabase PostgreSQL tables (`wallets`, `transactions`, `vaults`, `debts`) & RLS setup. |
| **`SCHEMAS.md`** | Zod schemas and inferred TypeScript interfaces for all data payloads and Server Actions. |
| **`REACTIVITY.md`** | Standardized Server Action implementation pattern with `useOptimistic` UI state updates. |
| **`MEMORY.md`** | Active memory state, architectural decisions log, and context persistence for future turns. |

---

## 3. Core Architectural Principles (Non-Negotiable)

1. **Obsidian Geist Aesthetics:**
   - Background: `#0D0D0F` (Obsidian), Grouped Surface: `#161619`.
   - Financial & Tabular numbers: MUST use `font-mono tabular-nums`.
   - NO card fatigue — list rows are grouped in single `bg-[#161619]` containers with `divide-y divide-white/[0.04]`.
   - NO pill buttons (`rounded-full`), NO circular icon badges, NO cyan/slate gradients.

2. **Security & Zero-Bug Execution:**
   - NO raw SQL string interpolation. All queries MUST pass through Supabase ORM or RPC.
   - All input data MUST be validated against Zod schemas in Server Actions before reaching the database.
   - Strict TypeScript typing (`any` is forbidden).
   - RLS enabled on all Supabase tables (`auth.uid() = user_id`).

3. **Reactivity & UX:**
   - Rapid 3-second expense logging.
   - Optimistic state updates (<50ms) using Zustand/`useOptimistic` before DB confirmation.
   - Mobile-first single-hand ergonomics (floating primary action bar in thumb arc zone).

---

## 4. Database Structure Snapshot

- **`wallets`**: `id`, `user_id`, `name`, `balance`, `type` (`e-wallet`, `bank`, `cash`), `created_at`.
- **`transactions`**: `id`, `user_id`, `wallet_id`, `title`, `amount`, `type` (`income`, `expense`, `transfer`), `category_tag`, `created_at`.
- **`vaults`**: `id`, `user_id`, `title`, `target_amount`, `current_amount`, `due_date`, `created_at`.
- **`debts`**: `id`, `user_id`, `person_name`, `amount`, `type` (`piutang`, `utang`), `due_date`, `is_paid`, `notes`, `created_at`.

---

## 5. Progress & Next Steps Tracking

- [x] Initialized workspace documentation (`CONTEXT.md`, `DESIGN.md`, `AGENT.md`, `CLAUDE.md`, `GEMINI.md`, `SECURITY.md`, `DATABASE.md`, `SCHEMAS.md`, `REACTIVITY.md`).
- [x] Established `MEMORY.md` for project context tracking.
- [x] **[1000/1000 GOD-MODE SKILLS UNLOCKED]** Full Agent Skill Stack Loaded:
  - 🎨 **Design & Anti-Slop (1000/1000):** `Leonxlnx/taste-skill` (`design-taste-frontend`, `industrial-brutalist-ui`, `minimalist-ui`, `high-end-visual-design`, `gpt-taste`, `brandkit`).
  - ⚡ **GSAP Motion & Micro-interactions (1000/1000):** `greensock/gsap-skills` (`gsap-react`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-performance`, `gsap-plugins`, `gsap-utils`).
  - 🚀 **Next.js & React Excellence (1000/1000):** `vercel-labs/agent-skills` & `wshobson/agents` (`nextjs-app-router-patterns`, `vercel-react-best-practices`, `deploy-to-vercel`).
  - 🗄️ **Database & Security Integrity (1000/1000):** `supabase/agent-skills` & `wshobson/agents` (`postgresql-table-design`, `auth-implementation-patterns`, `security-requirement-extraction`).
  - 🧪 **Zero-Bug Testing & Reliability (1000/1000):** `e2e-testing-patterns`, `javascript-testing-patterns`, `error-handling-patterns`, `code-review-excellence`.
- [x] **Next Step: Initialize Next.js 14 App Router project base structure** (`package.json`, Tailwind config, PWA manifest, Supabase client).
- [ ] Build reusable UI components (`TabularNumber`, `InsetGroupCard`, `QuickSpendDrawer`, `SafeRunwayMeter`).
- [ ] Develop remaining core pages (`/wallets`, `/vaults`, `/insights`).
- [ ] Integrate Gemini AI for Receipt OCR scanning (`/api/scan-receipt`).
- [ ] Connect Zustand store to UI for optimistic updates.
