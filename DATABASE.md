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

# DATABASE.md

## Supabase PostgreSQL Schema & Security Infrastructure

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. WALLETS TABLE
create table public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  balance numeric(15, 2) not null default 0.00,
  type text check (type in ('e-wallet', 'bank', 'cash')) default 'bank',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TRANSACTIONS TABLE
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  title text not null,
  amount numeric(15, 2) not null,
  type text check (type in ('income', 'expense', 'transfer')) not null,
  category_tag text not null default 'GENERAL',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. VAULTS TABLE (SAVINGS GOALS)
create table public.vaults (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  target_amount numeric(15, 2) not null,
  current_amount numeric(15, 2) not null default 0.00,
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. DEBTS TABLE (UTANG-PIUTANG)
create table public.debts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  person_name text not null,
  amount numeric(15, 2) not null,
  type text check (type in ('piutang', 'utang')) not null,
  due_date date,
  is_paid boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS) POLICIES
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.vaults enable row level security;
alter table public.debts enable row level security;

create policy "Users can manage own wallets" on public.wallets
  for all using (auth.uid() = user_id);

create policy "Users can manage own transactions" on public.transactions
  for all using (auth.uid() = user_id);

create policy "Users can manage own vaults" on public.vaults
  for all using (auth.uid() = user_id);

create policy "Users can manage own debts" on public.debts
  for all using (auth.uid() = user_id);
```
