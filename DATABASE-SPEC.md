# KASDESK — Database Specification (Supabase PostgreSQL)

**Status:** Draft v1.0
**Last Updated:** 2026-09-09
**Authoritative for:** schema, RLS, RPC, migrations, Zod alignment
**Supersedes:** `DATABASE.md`, `SCHEMAS.md` (both marked superseded)
**Derived from:** `PRD.md` (see §12 Resolved Conflicts)

> ⚠️ Per the `supabase` skill: *"Supabase changes frequently — verify against changelog
> and current docs before implementing. Do not rely on training data."*
> Before running any DDL below, fetch `https://supabase.com/changelog.md` and scan for
> `breaking-change` tags.

---

## 1. Design Principles

### 1.1 Type Mandates (from `postgresql-table-design`)

The skill publishes an explicit **banned types** list. These are ADR-blocking:

| ❌ Banned | ✅ Required | Reason |
| :--- | :--- | :--- |
| `money` | `numeric` | `money` is locale-dependent and loses precision semantics |
| `timestamp` (no tz) | `timestamptz` | Ambiguous across timezones |
| `char(n)` / `varchar(n)` | `text` | No perf benefit in Postgres; length limits via `CHECK` |
| `timetz` | `timestamptz` | `timetz` is a known Postgres anti-pattern |
| `timestamptz(0)` | `timestamptz` | Do not specify precision |
| `serial` | `generated always as identity` | Modern standard, clearer privileges |

Core guidance (verbatim): *"Prefer **TIMESTAMPTZ** for event time; **NUMERIC** for money;
**TEXT** for strings; **BIGINT** for integer values."*

### 1.2 Currency Representation — Decision

**Decision: store IDR as `numeric(15,2)`, not `bigint`.**

| Option | Verdict | Reasoning |
| :--- | :--- | :--- |
| `numeric(15,2)` | ✅ **Chosen** | Exact decimal arithmetic. Handles the (rare but real) cases with sen/rupiah fractions, e.g. fuel prices (Rp 12.350,50), PPN rounding (11%), and e-wallet topup fees. Max Rp 999.999.999.999,99 — far beyond any personal balance. |
| `bigint` (rupiah units) | ❌ Rejected | Rejects fractional rupiah. Would force premature rounding on PPN 11% calculations, creating cent-level drift that is *very* hard to debug in financial data. |
| `float` / `double` | ❌ Rejected | Binary floating point cannot represent decimal money exactly. Never acceptable for finance. |
| `money` type | ❌ Rejected | Banned by the skill; locale-dependent output. |

**Enforce non-negative and > 0 at the constraint level** (fixes PRD §11.3 — see §5.2).

### 1.3 Naming Conventions

| Rule | Example |
| :--- | :--- |
| Tables: plural, snake_case | `wallets`, `transactions` |
| Columns: snake_case | `target_amount`, `created_at` |
| PK: always `id uuid` | `id uuid primary key default gen_random_uuid()` |
| FK: `<entity>_id` | `wallet_id`, `category_id` |
| Timestamps: `created_at`, `updated_at` | both `timestamptz` |
| Booleans: `is_` / `has_` prefix | `is_paid`, `is_active` |
| Enums via `text` + `CHECK` | See §1.4 |

### 1.4 Enums: `text` + `CHECK`, not PG enum type

**Decision:** use `text` with `CHECK` constraints rather than native `CREATE TYPE ... AS ENUM`.

Rationale:
- Native PG enums cannot have values removed or reordered without `ALTER TYPE` gymnastics.
- `text` + `CHECK` allows additive migration with zero downtime (add value → deploy → use).
- Supabase generated types handle both, but `text` avoids enum-drift between DB and TS.

Enum values (authoritative per PRD §12.2):

| Table | Column | Values |
| :--- | :--- | :--- |
| `wallets` | `type` | `cash`, `bank`, `e-wallet` |
| `transactions` | `type` | `income`, `expense`, `transfer` |
| `debts` | `type` | `piutang`, `utang` |
| `categories` | `type` | `income`, `expense` |

---

## 2. Schema — Complete DDL

### 2.0 Extensions & Helpers

```sql
-- ============================================================
-- 000_base.sql
-- ============================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- Generic updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Returns the current authenticated user id (used by RLS)
-- Wrapped so policies read cleanly and stay index-friendly.
create or replace function public.uid()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;
```

> **Note on `auth.uid()`:** the `supabase-postgres-best-practices` skill recommends
> wrapping `auth.uid()` in a `select` (as above) so the planner can cache it per-statement.
> Always qualify it `(select auth.uid())` in policies.

---

### 2.1 `categories`

New table (per PRD §12.3 — categories are in v1, `profiles` deferred).

```sql
-- ============================================================
-- 001_categories.sql
-- ============================================================

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,  -- NULL = system default
  name        text not null,
  slug        text not null,          -- uppercase tag, e.g. 'MAKAN'
  type        text not null check (type in ('income','expense')),
  icon        text,                   -- lucide icon name, optional
  sort_order  integer not null default 0,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- slug is the machine tag rendered as [MAKAN]; must be uppercase-safe
  constraint categories_slug_format check (slug ~ '^[A-Z0-9_]{1,20}$'),
  constraint categories_unique_per_user unique (user_id, slug, type)
);

create index idx_categories_user_type
  on public.categories (user_id, type, sort_order);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();
```

**Why `user_id` is nullable:** system-seeded categories (`is_system = true`) are shared
across all users with `user_id = null`. This avoids duplicating 8 rows per user and lets
us add a default category globally later.

---

### 2.2 `wallets`

```sql
-- ============================================================
-- 002_wallets.sql
-- ============================================================

create table public.wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('cash','bank','e-wallet')),
  balance     numeric(15,2) not null default 0.00,
  icon        text,
  color       text,
  is_active   boolean not null default true,   -- archived instead of deleted
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint wallets_name_length check (char_length(name) between 1 and 50),
  -- Balance may go negative (overdraft reality) but must stay sane
  constraint wallets_balance_range check (balance >= -1000000000 and balance <= 1000000000)
);

-- Primary read pattern: "all active wallets for this user"
create index idx_wallets_user_active
  on public.wallets (user_id)
  where is_active = true;

create trigger trg_wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();
```

**Design note:** `is_active` (soft delete) rather than hard delete, because transactions
reference wallets. Deleting a wallet would cascade-delete financial history — unacceptable.
PRD FR-WLT-4 requires exactly this.

---

### 2.3 `transactions`

```sql
-- ============================================================
-- 003_transactions.sql
-- ============================================================

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  wallet_id     uuid not null references public.wallets(id) on delete restrict,
  category_id   uuid references public.categories(id) on delete set null,
  title         text not null,
  amount        numeric(15,2) not null,
  type          text not null check (type in ('income','expense','transfer')),
  category_tag  text not null default 'LAINNYA',
  note          text,
  -- For transfers: the counterparty wallet
  to_wallet_id  uuid references public.wallets(id) on delete restrict,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- *** FIXES PRD §11.3: amount must be strictly positive ***
  constraint transactions_amount_positive check (amount > 0),
  constraint transactions_title_length check (char_length(title) between 1 and 100),
  constraint transactions_tag_format check (category_tag ~ '^[A-Z0-9_]{1,20}$'),
  constraint transactions_note_length check (note is null or char_length(note) <= 200),

  -- A transfer must have a destination wallet; a non-transfer must not
  constraint transfers_need_destination check (
    (type = 'transfer' and to_wallet_id is not null and to_wallet_id <> wallet_id)
    or
    (type <> 'transfer' and to_wallet_id is null)
  )
);
```

**Indexes — the single most important performance decision here.**

The dominant queries are:
1. Home feed: `where user_id = ? order by occurred_at desc limit 50`
2. Month summary: `where user_id = ? and occurred_at >= ? and occurred_at < ?`
3. Wallet detail: `where wallet_id = ? order by occurred_at desc`

```sql
-- (1) + (2): user + time, descending. Composite, matches ORDER BY exactly.
create index idx_transactions_user_time
  on public.transactions (user_id, occurred_at desc);

-- (3): wallet + time
create index idx_transactions_wallet_time
  on public.transactions (wallet_id, occurred_at desc);

-- (2) refined: user + time + type, for income/expense splits in a period
create index idx_transactions_user_time_type
  on public.transactions (user_id, occurred_at desc, type);

-- Transfers lookup by destination
create index idx_transactions_to_wallet
  on public.transactions (to_wallet_id)
  where to_wallet_id is not null;
```

**EXPLAIN rationale:** `user_id` is highly selective (one user sees only their rows), so it
leads the composite index. `occurred_at desc` follows so the index satisfies the `ORDER BY`
without a sort node — this is what keeps the home feed fast as the table grows. Without
the `desc` match, Postgres would need a `Sort` step over every matching row.

`idx_transactions_user_time_type` is a covering-ish refinement: including `type` lets the
monthly income/expense aggregation filter inside the index rather than re-checking the heap.

```sql
create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();
```

**Why `on delete restrict` for `wallet_id`:** deleting a wallet that has transactions
should be *blocked*, not silently cascade. Users archive (`is_active = false`) instead.

---

### 2.4 `vaults`

```sql
-- ============================================================
-- 004_vaults.sql
-- ============================================================

create table public.vaults (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  target_amount   numeric(15,2) not null,
  current_amount  numeric(15,2) not null default 0.00,
  target_date     date,
  icon            text,
  is_completed    boolean not null default false,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint vaults_target_positive check (target_amount > 0),
  constraint vaults_current_nonneg check (current_amount >= 0),
  constraint vaults_title_length check (char_length(title) between 1 and 60),
  constraint vaults_not_overfunded check (current_amount <= target_amount * 10)
);

create index idx_vaults_user on public.vaults (user_id, is_completed);

create trigger trg_vaults_updated_at
  before update on public.vaults
  for each row execute function public.set_updated_at();
```

**Critical for PRD FR-VLT-4 (Vault Allocation Lock):** total locked funds is
`sum(current_amount)` across a user's incomplete vaults. This must be subtracted from
available cash in the Safe Daily Spend calculation (PRD §6.7). Indexed via
`idx_vaults_user` — but note the Safe Daily Spend query needs an aggregate, so a partial
index on incomplete vaults is even better:

```sql
create index idx_vaults_active_sum
  on public.vaults (user_id)
  include (current_amount)
  where is_completed = false;
```

---

### 2.5 `debts`

```sql
-- ============================================================
-- 005_debts.sql
-- ============================================================

create table public.debts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  person_name   text not null,
  phone_number  text,
  amount        numeric(15,2) not null,
  paid_amount   numeric(15,2) not null default 0.00,   -- enables PARTIAL
  type          text not null check (type in ('piutang','utang')),
  is_paid       boolean not null default false,        -- kept per PRD §12.4
  due_date      date,
  notes         text,
  settled_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint debts_amount_positive check (amount > 0),
  constraint debts_paid_nonneg check (paid_amount >= 0),
  constraint debts_paid_not_exceed check (paid_amount <= amount),
  constraint debts_person_length check (char_length(person_name) between 1 and 50),
  constraint debts_notes_length check (notes is null or char_length(notes) <= 200)
);

create index idx_debts_user_type on public.debts (user_id, type, is_paid);
create index idx_debts_due on public.debts (user_id, due_date)
  where is_paid = false;

create trigger trg_debts_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();
```

**Reconciliation (PRD §12.4):** `CONTEXT.md` wanted `UNPAID|PARTIAL|SETTLED`; the code has
`is_paid boolean`. We keep `is_paid` **and** add `paid_amount`, which lets us derive all
three legacy states without a migration of the boolean:

```sql
-- Derived status (expose as a view, don't store)
create view public.debts_with_status as
select
  d.*,
  case
    when d.is_paid                     then 'SETTLED'
    when d.paid_amount > 0             then 'PARTIAL'
    else                                    'UNPAID'
  end as status
from public.debts d;
```

---

## 3. The Atomic Balance Problem — RPC (fixes PRD §11.4)

### 3.1 The Defect

`lib/actions.ts` contains:

```ts
// 4. Update Wallet Balance (This should ideally be a database function/trigger, ...)
// For now, we will assume a trigger handles the wallet balance update.
```

**No such trigger exists in `DATABASE.md`.** Result: transactions insert fine, but wallet
balances never change. This is the single most severe correctness bug in the codebase.

### 3.2 Why a trigger is the wrong fix

A naive `AFTER INSERT` trigger works for the happy path but fails these cases:
- **Transfers** touch two wallets — needs symmetric handling.
- **Updates** (user edits amount) must reverse the old effect then apply the new.
- **Deletes** must reverse.
- Race conditions: two concurrent writes to the same wallet.

**Decision:** a single `SECURITY DEFINER` RPC that does everything atomically.
This satisfies PRD NR-REL-3 ("All mutations atomic") and SECURITY.md §1
("use atomic PostgreSQL Functions (RPC) defined with typed input parameters").

### 3.3 `create_transaction` RPC

```sql
-- ============================================================
-- 006_rpc_create_transaction.sql
-- ============================================================

create or replace function public.create_transaction(
  p_wallet_id    uuid,
  p_amount       numeric,
  p_type         text,
  p_title        text,
  p_category_tag text default 'LAINNYA',
  p_note         text default null,
  p_occurred_at  timestamptz default now(),
  p_to_wallet_id uuid default null,
  p_category_id  uuid default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_txn      public.transactions;
  v_owns_src boolean;
  v_owns_dst boolean;
begin
  -- ---- Guard: authenticated ----
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: not authenticated';
  end if;

  -- ---- Guard: amount must be positive (PRD §11.3) ----
  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: amount must be greater than zero';
  end if;

  -- ---- Guard: type is valid ----
  if p_type not in ('income','expense','transfer') then
    raise exception 'INVALID_TYPE: %', p_type;
  end if;

  -- ---- Guard: user owns the source wallet ----
  select exists(
    select 1 from public.wallets w
    where w.id = p_wallet_id and w.user_id = v_uid and w.is_active
  ) into v_owns_src;

  if not v_owns_src then
    raise exception 'FORBIDDEN_WALLET: source wallet not owned or inactive';
  end if;

  -- ---- Guard: user owns the destination wallet (transfers only) ----
  if p_type = 'transfer' then
    if p_to_wallet_id is null then
      raise exception 'INVALID_TRANSFER: destination wallet required';
    end if;

    if p_to_wallet_id = p_wallet_id then
      raise exception 'INVALID_TRANSFER: source and destination must differ';
    end if;

    select exists(
      select 1 from public.wallets w
      where w.id = p_to_wallet_id and w.user_id = v_uid and w.is_active
    ) into v_owns_dst;

    if not v_owns_dst then
      raise exception 'FORBIDDEN_WALLET: destination wallet not owned or inactive';
    end if;
  end if;

  -- ---- Insert the transaction row ----
  insert into public.transactions (
    user_id, wallet_id, category_id, title, amount, type,
    category_tag, note, occurred_at, to_wallet_id
  ) values (
    v_uid, p_wallet_id, p_category_id, p_title, p_amount, p_type,
    upper(coalesce(p_category_tag, 'LAINNYA')), p_note, p_occurred_at,
    case when p_type = 'transfer' then p_to_wallet_id else null end
  )
  returning * into v_txn;

  -- ---- Apply balance effect ATOMICALLY in the same transaction ----
  if p_type = 'income' then
    update public.wallets
       set balance = balance + p_amount
     where id = p_wallet_id;

  elsif p_type = 'expense' then
    update public.wallets
       set balance = balance - p_amount
     where id = p_wallet_id;

  elsif p_type = 'transfer' then
    -- double entry: debit source, credit destination
    update public.wallets
       set balance = balance - p_amount
     where id = p_wallet_id;

    update public.wallets
       set balance = balance + p_amount
     where id = p_to_wallet_id;
  end if;

  return v_txn;
end;
$$;

-- Only the authenticated role may execute (anon is blocked by RLS anyway,
-- but we revoke explicitly for defense in depth).
revoke all on function public.create_transaction(
  uuid, numeric, text, text, text, text, timestamptz, uuid, uuid
) from public, anon;
grant execute on function public.create_transaction(
  uuid, numeric, text, text, text, text, timestamptz, uuid, uuid
) to authenticated;
```

> **Why `security definer` + explicit ownership guards:** the function must write to
> `wallets` for the balance update even though RLS on `wallets` is `FOR ALL USING (uid)`.
> With `security definer` the function runs as owner, so **the guards above are the only
> thing protecting cross-user access** — they are mandatory, not decorative.
> `set search_path = public` prevents search-path hijacking.

### 3.4 `delete_transaction` RPC (reverses balance)

```sql
-- ============================================================
-- 007_rpc_delete_transaction.sql
-- ============================================================

create or replace function public.delete_transaction(p_transaction_id uuid)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_txn public.transactions;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: not authenticated';
  end if;

  -- Lock the row and verify ownership
  select * into v_txn
    from public.transactions
   where id = p_transaction_id and user_id = v_uid
     for update;

  if not found then
    raise exception 'NOT_FOUND: transaction not found or not owned';
  end if;

  -- Reverse the balance effect
  if v_txn.type = 'income' then
    update public.wallets set balance = balance - v_txn.amount
     where id = v_txn.wallet_id;

  elsif v_txn.type = 'expense' then
    update public.wallets set balance = balance + v_txn.amount
     where id = v_txn.wallet_id;

  elsif v_txn.type = 'transfer' then
    update public.wallets set balance = balance + v_txn.amount
     where id = v_txn.wallet_id;               -- return to source
    update public.wallets set balance = balance - v_txn.amount
     where id = v_txn.to_wallet_id;            -- remove from destination
  end if;

  delete from public.transactions where id = p_transaction_id;
  return v_txn;
end;
$$;

revoke all on function public.delete_transaction(uuid) from public, anon;
grant execute on function public.delete_transaction(uuid) to authenticated;
```

### 3.5 `update_transaction` RPC

Updates must reverse the old effect, then apply the new one:

```sql
-- ============================================================
-- 008_rpc_update_transaction.sql
-- ============================================================

create or replace function public.update_transaction(
  p_transaction_id uuid,
  p_amount         numeric default null,
  p_title          text default null,
  p_category_tag   text default null,
  p_note           text default null,
  p_occurred_at    timestamptz default null,
  p_wallet_id      uuid default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_old    public.transactions;
  v_new    public.transactions;
  v_target uuid;
  v_amount numeric;
  v_title  text;
  v_tag    text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED: not authenticated';
  end if;

  select * into v_old
    from public.transactions
   where id = p_transaction_id and user_id = v_uid
     for update;

  if not found then
    raise exception 'NOT_FOUND: transaction not found or not owned';
  end if;

  v_target := coalesce(p_wallet_id, v_old.wallet_id);
  v_amount := coalesce(p_amount, v_old.amount);
  v_title  := coalesce(p_title, v_old.title);
  v_tag    := upper(coalesce(p_category_tag, v_old.category_tag));

  if v_amount <= 0 then
    raise exception 'INVALID_AMOUNT: amount must be greater than zero';
  end if;

  -- Reject moving a transaction to a wallet the user doesn't own
  if p_wallet_id is not null and p_wallet_id <> v_old.wallet_id then
    if not exists(
      select 1 from public.wallets w
      where w.id = p_wallet_id and w.user_id = v_uid and w.is_active
    ) then
      raise exception 'FORBIDDEN_WALLET: target wallet not owned';
    end if;
  end if;

  -- 1) reverse old effect on the OLD wallet
  if v_old.type = 'income' then
    update public.wallets set balance = balance - v_old.amount where id = v_old.wallet_id;
  elsif v_old.type = 'expense' then
    update public.wallets set balance = balance + v_old.amount where id = v_old.wallet_id;
  elsif v_old.type = 'transfer' then
    update public.wallets set balance = balance + v_old.amount where id = v_old.wallet_id;
    update public.wallets set balance = balance - v_old.amount where id = v_old.to_wallet_id;
  end if;

  -- 2) apply new row values
  update public.transactions
     set amount       = v_amount,
         title        = v_title,
         category_tag = v_tag,
         note         = coalesce(p_note, v_old.note),
         occurred_at  = coalesce(p_occurred_at, v_old.occurred_at),
         wallet_id    = v_target
   where id = p_transaction_id
  returning * into v_new;

  -- 3) re-apply effect on the (possibly new) wallet
  if v_new.type = 'income' then
    update public.wallets set balance = balance + v_amount where id = v_target;
  elsif v_new.type = 'expense' then
    update public.wallets set balance = balance - v_amount where id = v_target;
  elsif v_new.type = 'transfer' then
    update public.wallets set balance = balance - v_amount where id = v_target;
    update public.wallets set balance = balance + v_amount where id = v_new.to_wallet_id;
  end if;

  return v_new;
end;
$$;

revoke all on function public.update_transaction(
  uuid, numeric, text, text, text, timestamptz, uuid
) from public, anon;
grant execute on function public.update_transaction(
  uuid, numeric, text, text, text, timestamptz, uuid
) to authenticated;
```

---

## 4. Row Level Security

### 4.1 Policy Pattern

All policies use **`USING` + `WITH CHECK`** (PRD §12.12). `USING` filters what you can
*see*; `WITH CHECK` blocks writing a row that would be owned by someone else. Without
`WITH CHECK`, a user could insert a row with another user's `user_id`.

```sql
-- Template applied to every user-owned table
alter table public.<table> enable row level security;

create policy "<table>_select_own" on public.<table>
  for select using ((select auth.uid()) = user_id);

create policy "<table>_insert_own" on public.<table>
  for insert with check ((select auth.uid()) = user_id);

create policy "<table>_update_own" on public.<table>
  for update using ((select auth.uid()) = user_id)
            with check ((select auth.uid()) = user_id);

create policy "<table>_delete_own" on public.<table>
  for delete using ((select auth.uid()) = user_id);
```

### 4.2 Applied to all tables

```sql
-- ============================================================
-- 009_rls.sql
-- ============================================================

-- ---- WALLETS ----
alter table public.wallets enable row level security;
create policy wallets_select_own on public.wallets for select using ((select auth.uid()) = user_id);
create policy wallets_insert_own on public.wallets for insert with check ((select auth.uid()) = user_id);
create policy wallets_update_own on public.wallets for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy wallets_delete_own on public.wallets for delete using ((select auth.uid()) = user_id);

-- ---- TRANSACTIONS ----
alter table public.transactions enable row level security;
create policy txn_select_own on public.transactions for select using ((select auth.uid()) = user_id);
create policy txn_insert_own on public.transactions for insert with check ((select auth.uid()) = user_id);
create policy txn_update_own on public.transactions for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy txn_delete_own on public.transactions for delete using ((select auth.uid()) = user_id);

-- ---- VAULTS ----
alter table public.vaults enable row level security;
create policy vaults_select_own on public.vaults for select using ((select auth.uid()) = user_id);
create policy vaults_insert_own on public.vaults for insert with check ((select auth.uid()) = user_id);
create policy vaults_update_own on public.vaults for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy vaults_delete_own on public.vaults for delete using ((select auth.uid()) = user_id);

-- ---- DEBTS ----
alter table public.debts enable row level security;
create policy debts_select_own on public.debts for select using ((select auth.uid()) = user_id);
create policy debts_insert_own on public.debts for insert with check ((select auth.uid()) = user_id);
create policy debts_update_own on public.debts for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy debts_delete_own on public.debts for delete using ((select auth.uid()) = user_id);

-- ---- CATEGORIES (special: system rows are readable by all) ----
alter table public.categories enable row level security;

create policy categories_read on public.categories
  for select using (
    is_system = true
    or (select auth.uid()) = user_id
  );

create policy categories_insert_own on public.categories
  for insert with check ((select auth.uid()) = user_id and is_system = false);

create policy categories_update_own on public.categories
  for update using ((select auth.uid()) = user_id and is_system = false)
          with check ((select auth.uid()) = user_id and is_system = false);

create policy categories_delete_own on public.categories
  for delete using ((select auth.uid()) = user_id and is_system = false);
```

> ⚠️ **RLS performance note** (from `supabase-postgres-best-practices`): always wrap
> `auth.uid()` as `(select auth.uid())` so Postgres treats it as a stable, cacheable
> initplan rather than re-evaluating per row. On a large `transactions` table this is the
> difference between an index scan and a full scan.

### 4.3 RPC and RLS interaction

The RPCs in §3 are `security definer`, so **RLS is bypassed inside them** — which is why
every RPC re-validates ownership explicitly. Defense in depth:

1. RLS protects direct table access from the client.
2. RPC ownership guards protect the `security definer` path.
3. `.select()` from the client is still RLS-filtered.

---

## 5. Zod Schemas (aligned with this DDL)

### 5.1 The Fix for PRD §11.3

Current `lib/schemas.ts`:
```ts
amount: z.number(),          // ❌ accepts 0 and negatives
```
`SECURITY.md` demanded `z.number().positive(...)`. Resolved:

```ts
amount: z.number().positive("Amount must be greater than 0")
```

Enforced at **three** layers (belt and braces):
1. Zod in the Server Action (fast user feedback)
2. DB `CHECK (amount > 0)` (authoritative)
3. RPC guard `if p_amount <= 0 then raise` (defense in depth)

### 5.2 Complete Schema File

```ts
// lib/schemas.ts — aligned with DATABASE-SPEC.md
import { z } from 'zod';

// ---------- Enums (single source of truth) ----------
export const WalletTypeSchema    = z.enum(['cash', 'bank', 'e-wallet']);
export const TxTypeSchema        = z.enum(['income', 'expense', 'transfer']);
export const DebtTypeSchema      = z.enum(['piutang', 'utang']);
export const CategoryTypeSchema  = z.enum(['income', 'expense']);

// Money: positive, at most 2 decimal places, within numeric(15,2)
export const MoneySchema = z
  .number()
  .positive('Amount must be greater than 0')
  .max(999_999_999_999.99, 'Amount exceeds maximum')
  .refine((v) => Number.isFinite(v), 'Amount must be finite');

// Category tag: uppercase, 1-20 chars, matches DB CHECK
export const CategoryTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Z0-9_]+$/, 'Tag must be A-Z, 0-9 or _')
  .default('LAINNYA');

// ---------- Categories ----------
export const CategorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(50).trim(),
  slug: CategoryTagSchema,
  type: CategoryTypeSchema,
  icon: z.string().nullable(),
  sort_order: z.number().int().nonnegative(),
  is_system: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ---------- Wallets ----------
export const WalletSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(50).trim(),
  type: WalletTypeSchema,
  balance: z.number(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateWalletSchema = WalletSchema.pick({
  name: true, type: true,
}).extend({
  balance: z.number().min(0).default(0),   // starting balance may be 0
  icon: z.string().optional(),
  color: z.string().optional(),
});

// ---------- Transactions ----------
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  title: z.string().min(1).max(100).trim(),
  amount: MoneySchema,
  type: TxTypeSchema,
  category_tag: CategoryTagSchema,
  note: z.string().max(200).nullable(),
  to_wallet_id: z.string().uuid().nullable(),
  occurred_at: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateTransactionSchema = z
  .object({
    wallet_id: z.string().uuid('Invalid Wallet ID'),
    category_id: z.string().uuid().optional().nullable(),
    title: z.string().min(1, 'Title required').max(100).trim(),
    amount: MoneySchema,
    type: TxTypeSchema,
    category_tag: CategoryTagSchema,
    note: z.string().max(200).optional().nullable(),
    occurred_at: z.string().datetime().optional(),
    to_wallet_id: z.string().uuid().optional().nullable(),
  })
  .refine(
    (d) => (d.type === 'transfer' ? !!d.to_wallet_id : !d.to_wallet_id),
    { message: 'Transfers require a destination wallet', path: ['to_wallet_id'] }
  )
  .refine(
    (d) => (d.type === 'transfer' ? d.to_wallet_id !== d.wallet_id : true),
    { message: 'Source and destination must differ', path: ['to_wallet_id'] }
  );

// ---------- Vaults ----------
export const VaultSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(60).trim(),
  target_amount: z.number().positive(),
  current_amount: z.number().nonnegative(),
  target_date: z.string().nullable(),
  icon: z.string().nullable(),
  is_completed: z.boolean(),
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateVaultSchema = VaultSchema.pick({
  title: true, target_amount: true,
}).extend({
  target_date: z.string().nullable().optional(),
  icon: z.string().optional(),
});

// ---------- Debts ----------
export const DebtSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  person_name: z.string().min(1).max(50).trim(),
  phone_number: z.string().max(20).nullable(),
  amount: z.number().positive(),
  paid_amount: z.number().nonnegative(),
  type: DebtTypeSchema,
  is_paid: z.boolean(),
  due_date: z.string().nullable(),
  notes: z.string().max(200).nullable(),
  settled_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateDebtSchema = z.object({
  person_name: z.string().min(1).max(50).trim(),
  phone_number: z.string().max(20).optional().nullable(),
  amount: z.number().positive(),
  type: DebtTypeSchema,
  due_date: z.string().nullable().optional(),
  notes: z.string().max(200).optional().nullable(),
});

// ---------- Gemini OCR (per PRD §9.2) ----------
export const GeminiOCRResponseSchema = z.object({
  merchant_name: z.string().default('Unknown Merchant'),
  items: z
    .array(
      z.object({
        name: z.string(),
        price: z.number().nonnegative(),
        quantity: z.number().positive().default(1),
      })
    )
    .default([]),
  detected_total: z.number().nonnegative(),
  confidence_score: z.number().min(0).max(1),
  detected_category: CategoryTagSchema,
});

// ---------- Types ----------
export type Wallet = z.infer<typeof WalletSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type Vault = z.infer<typeof VaultSchema>;
export type Debt = z.infer<typeof DebtSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type GeminiOCRResponse = z.infer<typeof GeminiOCRResponseSchema>;

// ---------- Server Action result ----------
export type ActionResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };
```

---

## 6. Seed Data

```sql
-- ============================================================
-- 010_seed.sql
-- ============================================================

-- System default expense categories (Indonesian)
insert into public.categories (user_id, name, slug, type, sort_order, is_system) values
  (null, 'Makan & Minum', 'MAKAN',      'expense', 10, true),
  (null, 'Transport',     'TRANSPORT',  'expense', 20, true),
  (null, 'Belanja',       'BELANJA',    'expense', 30, true),
  (null, 'Tagihan',       'TAGIHAN',    'expense', 40, true),
  (null, 'Hiburan',       'HIBURAN',    'expense', 50, true),
  (null, 'Kesehatan',     'KESEHATAN',  'expense', 60, true),
  (null, 'Pendidikan',    'PENDIDIKAN', 'expense', 70, true),
  (null, 'Lainnya',       'LAINNYA',    'expense', 90, true);

-- System default income categories
insert into public.categories (user_id, name, slug, type, sort_order, is_system) values
  (null, 'Gaji',      'GAJI',      'income', 10, true),
  (null, 'Freelance', 'FREELANCE', 'income', 20, true),
  (null, 'Bonus',     'BONUS',     'income', 30, true),
  (null, 'Lainnya',   'LAINNYA',   'income', 90, true);
```

**New-user onboarding** (PRD FR-AUTH-7): after signup, create a default wallet.

```sql
-- Called from application code after auth.users insert, or via a trigger
create or replace function public.seed_new_user_defaults()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.wallets (user_id, name, type, balance)
  values (v_uid, 'Tunai', 'cash', 0)
  on conflict do nothing;
end;
$$;

revoke all on function public.seed_new_user_defaults() from public, anon;
grant execute on function public.seed_new_user_defaults() to authenticated;
```

> Alternative: an `after insert on auth.users` trigger. Preferred approach is to call the
> RPC from the client after first sign-in, because `auth.users` triggers run in the `auth`
> schema and need `security definer` with elevated grants — more moving parts.

---

## 7. Migration Plan

### 7.1 Zero-Downtime Strategy (from `database-migration`)

Numbered, forward-only, each reversible:

| # | File | Content | Rollback |
| :-- | :--- | :--- | :--- |
| 000 | `000_base.sql` | extensions, `set_updated_at()`, `uid()` | drop functions |
| 001 | `001_categories.sql` | categories table + RLS | `drop table categories` |
| 002 | `002_wallets.sql` | wallets table + RLS | `drop table wallets` |
| 003 | `003_transactions.sql` | transactions + indexes | `drop table transactions` |
| 004 | `004_vaults.sql` | vaults + partial index | `drop table vaults` |
| 005 | `005_debts.sql` | debts + view | `drop view`, `drop table` |
| 006 | `006_rpc_create_transaction.sql` | create RPC | `drop function` |
| 007 | `007_rpc_delete_transaction.sql` | delete RPC | `drop function` |
| 008 | `008_rpc_update_transaction.sql` | update RPC | `drop function` |
| 009 | `009_rls.sql` | all policies | `drop policy` each |
| 010 | `010_seed.sql` | default categories | `delete where is_system` |

**Expand → Migrate → Contract** for any breaking change:

1. **Expand** — add new nullable column / new table. Deploy. Old code still works.
2. **Migrate** — backfill in batches (`limit 1000` loops, not one big update).
3. **Contract** — add `NOT NULL` / drop old column only after code no longer reads it.

### 7.2 Migrating from the current (legacy) schema

The repo's existing `DATABASE.md` schema differs from this spec. Migration path:

| Legacy | Target | Action |
| :--- | :--- | :--- |
| `wallets.type` enum `e-wallet/bank/cash` | same | ✅ no change |
| `transactions` has no `to_wallet_id` | add | `alter table add column` (nullable) — **Expand** |
| `transactions` has no `category_id` | add | nullable, FK to categories |
| `transactions.created_at` used for display | add `occurred_at` | backfill `occurred_at = created_at` — **Migrate** |
| `debts` has no `paid_amount` | add | default 0 |
| `debts` has no `settled_at` | add | nullable |
| no `categories` table | create | new |
| `vaults` has no `is_completed` | add | derive: `current_amount >= target_amount` |
| no RPCs | create | new |
| RLS `using` only | add `with check` | `create policy ... with check` |

```sql
-- Example: expand + backfill for occurred_at
alter table public.transactions add column occurred_at timestamptz;

update public.transactions
   set occurred_at = created_at
 where occurred_at is null;      -- batch if table is large

alter table public.transactions
  alter column occurred_at set default now(),
  alter column occurred_at set not null;

create index idx_transactions_user_time
  on public.transactions (user_id, occurred_at desc);
```

### 7.3 Rollback Rules

- Every migration file has a documented inverse (table above).
- Never roll back by editing history — write a new forward migration.
- Test every migration against a **local Supabase** instance first:
  `supabase db reset` then `supabase db push`.
- Run `supabase db advisors` (or MCP `get_advisors`) after every migration.
- Per the skill: *"After implementing any fix, run a test query to confirm the change
  works. A fix without verification is incomplete."*

---

## 8. Generated TypeScript Types

```bash
# Generate from a live project
npx supabase gen types typescript --project-id "$PROJECT_REF" > types/database.types.ts

# Or from local
npx supabase gen types typescript --local > types/database.types.ts
```

Usage:

```ts
// lib/supabase/database.types.ts  (generated — do not edit by hand)
export type Database = {
  public: {
    Tables: {
      wallets: {
        Row: { id: string; user_id: string; name: string; /* ... */ }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      transactions: { /* ... */ }
      vaults: { /* ... */ }
      debts: { /* ... */ }
      categories: { /* ... */ }
    }
    Functions: {
      create_transaction: {
        Args: {
          p_wallet_id: string; p_amount: number; p_type: string;
          p_title: string; p_category_tag?: string; p_note?: string;
          p_occurred_at?: string; p_to_wallet_id?: string; p_category_id?: string;
        }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      delete_transaction: { Args: { p_transaction_id: string }; Returns: /* ... */ }
      update_transaction: { Args: { /* ... */ }; Returns: /* ... */ }
    }
  }
}
```

Wire into the clients:

```ts
import type { Database } from '@/lib/supabase/database.types'
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

This satisfies PRD NR-MAIN-2 (all DB types generated from schema).

---

## 9. Key Queries

### 9.1 Safe Daily Spend (PRD §6.7)

```sql
-- Inputs: p_user_id, p_cycle_end date
create or replace function public.safe_daily_spend(
  p_user_id uuid default auth.uid(),
  p_cycle_end date default (date_trunc('month', now()) + interval '1 month - 1 day')::date
)
returns numeric
language sql
stable
as $$
  with locked as (
    select coalesce(sum(v.current_amount), 0) as locked_funds
      from public.vaults v
     where v.user_id = p_user_id
       and v.is_completed = false
  ),
  available as (
    select coalesce(sum(w.balance), 0) as total
      from public.wallets w
     where w.user_id = p_user_id
       and w.is_active = true
  )
  select greatest(
    0,
    (available.total - locked.locked_funds)
      / greatest(1, (p_cycle_end - current_date) + 1)
  )
  from available, locked;
$$;
```

> Matches PRD §6.7: `spendable = Σ wallet balances − Σ vault current_amount`;
> `safe_daily_spend = max(0, spendable / days_left)`.
> `greatest(1, …)` guards division by zero on the last day of the cycle.

### 9.2 Home Feed (grouped by day)

```sql
select
  t.id, t.title, t.amount, t.type, t.category_tag,
  w.name as wallet_name,
  t.occurred_at
from public.transactions t
join public.wallets w on w.id = t.wallet_id
where t.user_id = auth.uid()
order by t.occurred_at desc
limit 50;
```
→ uses `idx_transactions_user_time`.

### 9.3 Monthly Summary

```sql
select
  type,
  coalesce(sum(amount), 0) as total
from public.transactions
where user_id = auth.uid()
  and occurred_at >= date_trunc('month', now())
  and occurred_at <  date_trunc('month', now()) + interval '1 month'
  and type in ('income','expense')
group by type;
```
→ uses `idx_transactions_user_time_type`.

### 9.4 7-Day Spending Flow

```sql
select
  d.day::date,
  coalesce(sum(t.amount), 0) as total
from generate_series(
  current_date - interval '6 days',
  current_date,
  interval '1 day'
) as d(day)
left join public.transactions t
  on t.occurred_at::date = d.day::date
 and t.user_id = auth.uid()
 and t.type = 'expense'
group by d.day
order by d.day;
```
`generate_series` guarantees zero-filled days — the chart never has gaps.

---

## 10. Data Retention & Deletion

Per PRD NR-SEC-8 (data-subject rights) and NG8 (no receipt retention).

| Data | Retention | Deletion |
| :--- | :--- | :--- |
| Transactions | Until user deletes | Cascade on user deletion |
| Wallets | Until user deletes | Restricted if has transactions → archive |
| Vaults / Debts | Until user deletes | Cascade |
| Receipt images | **Never stored** | N/A (PRD FR-OCR-7) |
| Auth records | Supabase-managed | `auth.users` delete cascades |

```sql
-- All user-owned tables use: references auth.users(id) on delete cascade
-- So deleting an auth user removes all their financial data automatically.
```

**Verification of cascade:**

```sql
-- Confirm no orphans after a test deletion
select count(*) from public.transactions t
left join auth.users u on u.id = t.user_id
where u.id is null;   -- must be 0
```

---

## 11. Verification Checklist

Before merging any schema change:

- [ ] `supabase db reset` succeeds locally from scratch
- [ ] `supabase db push` applies cleanly
- [ ] `supabase db advisors` reports no security warnings
- [ ] Every table has RLS **enabled**
- [ ] Every policy has both `USING` and `WITH CHECK` (except select-only)
- [ ] `auth.uid()` wrapped as `(select auth.uid())` in all policies
- [ ] No banned type appears in any migration (`money`, `timestamp`, `varchar(n)`, `serial`)
- [ ] `amount > 0` enforced at Zod + CHECK + RPC (PRD §11.3)
- [ ] Wallet balance changes only via RPC (PRD §11.4)
- [ ] Transfer creates balanced double-entry effect
- [ ] `create_transaction` rejects another user's wallet id (test it!)
- [ ] Indexes exist for all queries in §9
- [ ] `EXPLAIN ANALYZE` on §9.2 shows Index Scan, not Seq Scan
- [ ] Generated TS types committed

---

## 12. RLS Security Test (must pass)

```sql
-- Run as user A, attempt to read user B's data
set request.jwt.claim.sub = '<user_a_id>';
select count(*) from public.transactions where user_id = '<user_b_id>';
-- Expected: 0 (RLS filters)

-- Attempt to insert a row owned by user B
insert into public.transactions (user_id, wallet_id, title, amount, type)
values ('<user_b_id>', '<user_a_wallet>', 'hack', 1000, 'expense');
-- Expected: ERROR — new row violates WITH CHECK

-- Attempt the RPC against user B's wallet
select public.create_transaction(
  '<user_b_wallet_id>', 1000, 'expense', 'hack'
);
-- Expected: ERROR — FORBIDDEN_WALLET
```

---

**End of DATABASE-SPEC.md**
