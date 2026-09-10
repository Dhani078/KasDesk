# KASDESK — Database Specification (TiDB Cloud / MySQL)

**Status:** v2.0 — rewritten for MySQL
**Last Updated:** 2026-09-10
**Authoritative for:** schema, transactions, migrations, Zod alignment
**Supersedes:** v1.0 (Supabase PostgreSQL) and `DATABASE.md`

> ⚠️ **v1.0 of this document described PostgreSQL/Supabase. That stack was
> replaced.** The live database is **TiDB Cloud v8.5.3** (MySQL-compatible).
> Any remaining PostgreSQL syntax in this repo is stale — do not use it.

---

## 0. Stack Change & Rationale

| Aspect | v1.0 (old) | v2.0 (current) |
| :--- | :--- | :--- |
| Engine | PostgreSQL (Supabase) | **TiDB Cloud v8.5.3** (MySQL-compatible) |
| Wire protocol | Postgres | **MySQL** |
| Driver | `@supabase/supabase-js` | **`mysql2`** |
| ORM | — | **Drizzle ORM** |
| Auth | Supabase Auth (`auth.uid()`) | **Auth.js — app-layer `user_id`** |
| Authorization | **RLS policies** | **App-layer `WHERE user_id = ?`** |
| Money type | `numeric(15,2)` | **`BIGINT` (whole IDR)** |
| PK type | `uuid` | **`CHAR(36)`** |
| Migrations | Supabase CLI / SQL | **`scripts/migrate.js`** |

### 0.1 The Critical Consequence: No Row Level Security

MySQL/TiDB **has no RLS**. Supabase leaned on it as the authorization
boundary. We do not have it, so:

> **Every query MUST filter by `user_id` in the application layer.**
> There is no database safety net. A missing `WHERE user_id = ?` is a
> data leak across all users.

This is the single most important rule in this document.

### 0.2 Why `BIGINT` for Money (not `DECIMAL`)

IDR has no minor unit in practice — prices are whole rupiah (sen was
discontinued). Storing whole rupiah in `BIGINT` gives:

- Exact integer arithmetic (no float drift)
- Faster comparisons and indexes than `DECIMAL`
- `±9.22 × 10^18` range — effectively unbounded

**Rule:** store **whole rupiah**. Never store fractions. Format at the
presentation layer only.

| Amount | Stored |
| :--- | :--- |
| Rp 14.250.000 | `14250000` |
| Rp 35.000 | `35000` |

---

## 1. Design Principles

### 1.1 Type Mandates

| ✅ Use | ❌ Avoid | Why |
| :--- | :--- | :--- |
| `BIGINT` | `FLOAT` / `DOUBLE` | Money must never be floating point |
| `BIGINT` (whole IDR) | `DECIMAL` | No sen in IDR; integer is faster & exact |
| `DATETIME(3)` | `TIMESTAMP` | `TIMESTAMP` has a 2038 limit |
| `CHAR(36)` | `BINARY(16)` | UUIDs stored as readable text |
| `VARCHAR(n)` | `TEXT` | Length-bounded; indexable |
| `TINYINT` | `BOOLEAN` | MySQL `BOOLEAN` is an alias for `TINYINT(1)` |
| `utf8mb4` | `utf8` | `utf8` is 3-byte and breaks emoji |

### 1.2 Naming Conventions

- Tables: **plural**, `snake_case` — `transactions`, `wallets`
- Columns: `snake_case` in SQL, **camelCase** in the Drizzle schema
  (Drizzle maps them automatically)
- Timestamps: `created_at`, `updated_at`, `occurred_at`
- Foreign keys: `<entity>_id`
- Indexes: `<table>_<cols>_idx`, unique as `..._uq`

### 1.3 Enums: `VARCHAR` + app validation, not MySQL `ENUM`

MySQL `ENUM` requires `ALTER TABLE` to change — bad for evolving
categories. Use `VARCHAR` and validate with **Zod** at the app layer.

---

## 2. Schema — Complete DDL

> The canonical, executable version lives at
> **`drizzle/0000_init.sql`** (applied via `npm run db:push`).
> The TypeScript source of truth is **`lib/db/schema.ts`**.

### 2.1 `users`

```sql
CREATE TABLE `users` (
  `id`            CHAR(36)      NOT NULL,
  `email`         VARCHAR(255)  NOT NULL,
  `name`          VARCHAR(120)  DEFAULT NULL,
  `image`         VARCHAR(500)  DEFAULT NULL,
  `emailVerified` DATETIME(3)   DEFAULT NULL,
  `passwordHash`  VARCHAR(255)  DEFAULT NULL,
  `locale`        VARCHAR(8)    NOT NULL DEFAULT 'id-ID',
  `currency`      CHAR(3)       NOT NULL DEFAULT 'IDR',
  `createdAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_uq` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`passwordHash` is nullable: OAuth-only users have no password.

### 2.2 `accounts` (OAuth links)

```sql
CREATE TABLE `accounts` (
  `id`                CHAR(36)      NOT NULL,
  `userId`            CHAR(36)      NOT NULL,
  `provider`          VARCHAR(32)   NOT NULL,
  `providerAccountId` VARCHAR(255)  NOT NULL,
  `accessToken`       VARCHAR(1000) DEFAULT NULL,
  `refreshToken`      VARCHAR(1000) DEFAULT NULL,
  `expiresAt`         BIGINT        DEFAULT NULL,
  `createdAt`         DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_provider_uq` (`provider`, `providerAccountId`),
  KEY `accounts_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.3 `sessions`

```sql
CREATE TABLE `sessions` (
  `id`           CHAR(36)     NOT NULL,
  `userId`       CHAR(36)     NOT NULL,
  `sessionToken` VARCHAR(255) NOT NULL,
  `expires`      DATETIME(3)  NOT NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_token_uq` (`sessionToken`),
  KEY `sessions_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.4 `categories`

```sql
CREATE TABLE `categories` (
  `id`        CHAR(36)    NOT NULL,
  `userId`    CHAR(36)    NOT NULL,
  `name`      VARCHAR(32) NOT NULL,
  `kind`      VARCHAR(8)  NOT NULL,
  `sortOrder` TINYINT     NOT NULL DEFAULT 0,
  `isSystem`  TINYINT     NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_user_name_uq` (`userId`, `name`),
  KEY `categories_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.5 `wallets`

```sql
CREATE TABLE `wallets` (
  `id`         CHAR(36)    NOT NULL,
  `userId`     CHAR(36)    NOT NULL,
  `name`       VARCHAR(60) NOT NULL,
  `type`       VARCHAR(12) NOT NULL,
  `balance`    BIGINT      NOT NULL DEFAULT 0,
  `isArchived` TINYINT     NOT NULL DEFAULT 0,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                           ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `wallets_user_idx` (`userId`),
  KEY `wallets_user_archived_idx` (`userId`, `isArchived`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.6 `transactions`

```sql
CREATE TABLE `transactions` (
  `id`          CHAR(36)     NOT NULL,
  `userId`      CHAR(36)     NOT NULL,
  `walletId`    CHAR(36)     NOT NULL,
  `toWalletId`  CHAR(36)     DEFAULT NULL,
  `type`        VARCHAR(8)   NOT NULL,
  `amount`      BIGINT       NOT NULL,
  `title`       VARCHAR(120) NOT NULL,
  `categoryTag` VARCHAR(32)  DEFAULT NULL,
  `note`        VARCHAR(500) DEFAULT NULL,
  `occurredAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                             ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `tx_user_date_idx` (`userId`, `occurredAt`),
  KEY `tx_wallet_date_idx` (`walletId`, `occurredAt`),
  KEY `tx_user_wallet_idx` (`userId`, `walletId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Why these indexes:**

| Query | Index | Rationale |
| :--- | :--- | :--- |
| Home feed: user + recent date | `tx_user_date_idx` | Leftmost `userId` equality, then `occurredAt` range — satisfies `ORDER BY occurredAt DESC` **without a sort** |
| Wallet detail: wallet + date | `tx_wallet_date_idx` | Same shape, different leading column |
| Filter by wallet | `tx_user_wallet_idx` | Covers `WHERE userId = ? AND walletId = ?` |

⚠️ **TiDB note:** indexes are **eventually consistent** while DDL runs.
After adding an index, verify with `EXPLAIN` — do not assume it is live.

### 2.7 `vaults`

```sql
CREATE TABLE `vaults` (
  `id`            CHAR(36)    NOT NULL,
  `userId`        CHAR(36)    NOT NULL,
  `name`          VARCHAR(80) NOT NULL,
  `targetAmount`  BIGINT      NOT NULL,
  `currentAmount` BIGINT      NOT NULL DEFAULT 0,
  `targetDate`    DATETIME(3) DEFAULT NULL,
  `isCompleted`   TINYINT     NOT NULL DEFAULT 0,
  `createdAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `vaults_user_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.8 `debts`

```sql
CREATE TABLE `debts` (
  `id`         CHAR(36)     NOT NULL,
  `userId`     CHAR(36)     NOT NULL,
  `direction`  VARCHAR(8)   NOT NULL,
  `personName` VARCHAR(80)  NOT NULL,
  `amount`     BIGINT       NOT NULL,
  `paidAmount` BIGINT       NOT NULL DEFAULT 0,
  `isPaid`     TINYINT      NOT NULL DEFAULT 0,
  `note`       VARCHAR(500) DEFAULT NULL,
  `dueDate`    DATETIME(3)  DEFAULT NULL,
  `settledAt`  DATETIME(3)  DEFAULT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                            ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `debts_user_idx` (`userId`),
  KEY `debts_user_open_idx` (`userId`, `isPaid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. The Atomic Balance Problem (fixes PRD §11.4)

### 3.1 The Defect

The original `lib/actions.ts` contained:

```ts
// 4. Update Wallet Balance (should be a DB function/trigger...)
// For now, we will assume a trigger handles the wallet balance update.
```

**No such trigger existed.** Transactions were inserted and balances silently
stayed frozen.

### 3.2 Fix: application-level SQL transaction

MySQL supports stored procedures, but we keep balance logic in the
**application layer** as an explicit `db.transaction()` (Drizzle) — because:

1. It is testable with the same tooling as the rest of the app
2. It avoids a split-brain between SQL and TypeScript logic
3. Drizzle's `db.transaction()` issues real `BEGIN` / `COMMIT` / `ROLLBACK`

**The guarantee:** either the transaction row *and* the balance change both
commit, or neither does.

### 3.3 `createTransaction` (implemented)

```ts
await db.transaction(async (tx) => {
  // 1. Verify ownership — authorization happens HERE (no RLS!)
  const [wallet] = await tx.select({ id: wallets.id, balance: wallets.balance })
    .from(wallets)
    .where(and(eq(wallets.id, data.wallet_id), eq(wallets.userId, userId)))
    .limit(1)
  if (!wallet) throw new Error('WALLET_NOT_FOUND')

  // 2. Prevent overdraw
  if (data.type !== 'income' && wallet.balance < data.amount)
    throw new Error('INSUFFICIENT_BALANCE')

  // 3. Verify destination for transfers
  if (data.type === 'transfer') { /* same shape check on to_wallet_id */ }

  // 4. Insert row
  await tx.insert(transactions).values({ ... })

  // 5. Update balance
  if (data.type === 'income')  balance + amount
  if (data.type === 'expense') balance - amount
  if (data.type === 'transfer') source - amount, dest + amount
})
```

**Concurrency:** MySQL/InnoDB under `REPEATABLE READ` will not lose an
update here because the balance write is `UPDATE ... WHERE id = ?`, which
takes a row lock. Verified by test.

### 3.4 `deleteTransaction` (reverses the balance)

Applying the inverse operation inside the same transaction:

| Type | Reverse |
| :--- | :--- |
| `income` | `balance − amount` |
| `expense` | `balance + amount` |
| `transfer` | source `+ amount`, destination `− amount` |

⚠️ **Not yet implemented:** `updateTransaction` (editing an amount) must
apply the **delta**, not the new value. See §11.

---

## 4. Authorization (replaces RLS)

### 4.1 The Rule

```sql
-- ❌ NEVER: leaks every user's data
SELECT * FROM transactions WHERE id = ?

-- ✅ ALWAYS: scoped to the authenticated user
SELECT * FROM transactions WHERE id = ? AND user_id = ?
```

### 4.2 Mandatory Checks

Every Server Action must:

1. Call `requireUserId()` and bail if null
2. Include `eq(table.userId, userId)` in **every** `WHERE`
3. Verify ownership of referenced entities (e.g. `walletId`) —
   not just the row being written

### 4.3 Verification

`lib/actions.ts` already does this for `createTransaction`:
it fetches the wallet with **both** `id` and `userId` in the `WHERE`.
An attacker passing another user's `wallet_id` gets `WALLET_NOT_FOUND`.

---

## 5. Zod Schemas (aligned with this DDL)

### 5.1 The Fix for PRD §11.3

```ts
amount: z.number()
  .int('Jumlah harus bilangan bulat')
  .positive('Jumlah harus lebih dari 0')   // ← rejects 0 and negatives
  .max(100_000_000_000)
```

`BIGINT` maps to `.int()` — a decimal amount would be truncated by the
driver, so Zod rejects it before it reaches the DB.

### 5.2 Full Schema (`lib/schemas.ts`)

```ts
export const TransactionSchema = z.object({
  wallet_id: z.string().min(1, 'Dompet wajib dipilih'),
  to_wallet_id: z.string().min(1).optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().int().positive().max(100_000_000_000),
  title: z.string().trim().min(1).max(120),
  category_tag: z.enum(CATEGORY_ENUM).optional(),
  note: z.string().trim().max(500).optional(),
  occurred_at: z.string().datetime().optional(),
})
  .refine(d => d.type !== 'transfer' || !!d.to_wallet_id, { ... })
  .refine(d => d.type !== 'transfer' || d.wallet_id !== d.to_wallet_id, { ... })
```

---

## 6. Seed Data

### 6.1 Default Categories (Indonesian)

Seeded on user creation:

```sql
INSERT INTO categories (id, userId, name, kind, sortOrder, isSystem) VALUES
  (UUID(), ?, 'MAKAN',      'expense', 1, 1),
  (UUID(), ?, 'TRANSPORT',  'expense', 2, 1),
  (UUID(), ?, 'BELANJA',    'expense', 3, 1),
  (UUID(), ?, 'TAGIHAN',    'expense', 4, 1),
  (UUID(), ?, 'HIBURAN',    'expense', 5, 1),
  (UUID(), ?, 'KESEHATAN',  'expense', 6, 1),
  (UUID(), ?, 'PENDIDIKAN', 'expense', 7, 1),
  (UUID(), ?, 'LAINNYA',    'both',    8, 1),
  (UUID(), ?, 'GAJI',       'income',  9, 1);
```

### 6.2 Default Wallet

Every new user gets one wallet named `Tunai` of type `cash`, balance `0`.

---

## 7. Migration Plan

### 7.1 Current State

Migrations are plain SQL files under `drizzle/`, applied by
`scripts/migrate.js` (idempotent — uses `CREATE TABLE IF NOT EXISTS`).

```bash
npm run db:push
```

| File | Contents |
| :--- | :--- |
| `drizzle/0000_init.sql` | All 8 tables |

### 7.2 Rules

1. **Never edit an applied migration** — add a new numbered file.
2. Every migration must be **re-runnable** (`IF NOT EXISTS`).
3. Keep a rollback script beside each forward script.
4. Test on a branch database before production (TiDB supports branching).

### 7.3 Rollback

```sql
DROP TABLE IF EXISTS debts;
DROP TABLE IF EXISTS vaults;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS users;
```

⚠️ Destructive. Confirm the environment first.

### 7.4 Future: Drizzle Kit

Once the schema stabilises, adopt `drizzle-kit` for generated diffs:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## 8. Generated TypeScript Types

The Drizzle schema **is** the type source — no codegen step needed:

```ts
import type { Wallet, Transaction, Vault, Debt } from '@/lib/db/schema'
```

`drizzle-kit` can additionally introspect a live DB:

```bash
npx drizzle-kit introspect
```

---

## 9. Key Queries

### 9.1 Safe Daily Spend (PRD §6.7)

**Canonical formula** (also used by `QA-STRATEGY.md` tests):

```
safe_daily_spend = max(0,
  (total_liquid − vault_allocations − upcoming_debts) / days_remaining
)
```

```ts
export function calculateSafeDailySpend(i: {
  totalLiquid: number
  vaultAllocations: number
  upcomingDebts: number
  daysRemaining: number
}): number {
  const days = Math.max(1, i.daysRemaining)      // guard divide-by-zero
  const free = i.totalLiquid - i.vaultAllocations - i.upcomingDebts
  return Math.max(0, Math.floor(free / days))
}
```

SQL for the inputs:

```sql
-- Total liquid
SELECT COALESCE(SUM(balance), 0) FROM wallets
WHERE userId = ? AND isArchived = 0;

-- Vault allocations
SELECT COALESCE(SUM(currentAmount), 0) FROM vaults
WHERE userId = ? AND isCompleted = 0;

-- Upcoming unpaid debts this cycle
SELECT COALESCE(SUM(amount - paidAmount), 0) FROM debts
WHERE userId = ? AND isPaid = 0 AND dueDate <= ?;
```

### 9.2 Home Feed (recent transactions)

```sql
SELECT t.*, w.name AS walletName
FROM transactions t
JOIN wallets w ON w.id = t.walletId
WHERE t.userId = ?
ORDER BY t.occurredAt DESC
LIMIT 20;
```

### 9.3 Monthly Summary

```sql
SELECT
  SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
FROM transactions
WHERE userId = ?
  AND occurredAt >= ?
  AND occurredAt <  ?;
```

### 9.4 7-Day Spending Flow

```sql
SELECT DATE(occurredAt) AS d, SUM(amount) AS total
FROM transactions
WHERE userId = ? AND type = 'expense'
  AND occurredAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
GROUP BY DATE(occurredAt)
ORDER BY d;
```

### 9.5 Top Categories

```sql
SELECT categoryTag, SUM(amount) AS total
FROM transactions
WHERE userId = ? AND type = 'expense'
  AND occurredAt >= ?
GROUP BY categoryTag
ORDER BY total DESC
LIMIT 5;
```

---

## 10. Data Retention & Deletion

| Data | Retention |
| :--- | :--- |
| Transactions | While account active + 30 days after deletion request |
| Receipt images | **Never persisted** (FR-OCR-7) |
| Sessions | Until expiry; purge expired nightly |
| Backups | 30-day rolling |

### 10.1 Account Deletion Cascade

MySQL **cannot** cascade without foreign keys, and we intentionally
omit FKs (TiDB distributed DDL + app-level control). So deletion must be
**explicit and ordered**:

```sql
DELETE FROM transactions WHERE userId = ?;
DELETE FROM debts        WHERE userId = ?;
DELETE FROM vaults       WHERE userId = ?;
DELETE FROM wallets      WHERE userId = ?;
DELETE FROM categories   WHERE userId = ?;
DELETE FROM sessions     WHERE userId = ?;
DELETE FROM accounts     WHERE userId = ?;
DELETE FROM users        WHERE id     = ?;
```

Wrap in a transaction. Order matters: children before parent.

---

## 11. Verification Checklist

- [ ] `npm run db:push` applies cleanly
- [ ] All 8 tables exist in `kasdesk` (not `sys`)
- [ ] `amount` rejects `0` and negatives (Zod + test)
- [ ] Balance changes after `createTransaction`
- [ ] Balance reverses after `deleteTransaction`
- [ ] Transfer updates **both** wallets
- [ ] Overdraw is blocked
- [ ] Every query filters by `userId` (no RLS!)
- [ ] Passing another user's `wallet_id` → `WALLET_NOT_FOUND`
- [ ] `EXPLAIN` shows `tx_user_date_idx` used for the home feed
- [ ] All money is whole rupiah integers

### 11.1 Known Gap

`updateTransaction` (edit an amount) is **not implemented**. When added, it
must apply the **delta** — old vs new amount — not overwrite the balance.

---

## 12. Authorization Test (replaces the old RLS test)

```ts
it('user A cannot read user B transactions', async () => {
  const rows = await db.select().from(transactions)
    .where(and(eq(transactions.id, txB.id), eq(transactions.userId, userA.id)))
  expect(rows).toEqual([])
})

it('user A cannot use user B wallet', async () => {
  const res = await createTransaction({
    wallet_id: walletB.id,
    type: 'expense',
    amount: 1000,
    title: 'x',
  })
  expect(res.success).toBe(false)
})
```

Without RLS, these tests are **not optional** — they are the only thing
standing between users and each other's financial data.

---

## 13. TiDB-Specific Notes

| Behaviour | Implication |
| :--- | :--- |
| MySQL wire protocol | Use `mysql2`, not `pg` |
| Distributed transactions | Supported, but keep them short |
| Auto-increment | Values are **not guaranteed contiguous** — irrelevant for UUID PKs |
| DDL is online | Schema changes do not block reads/writes |
| Index consistency | New indexes are eventually consistent — verify with `EXPLAIN` |
| Connection limits | Serverless scales to zero — use a small pool (5) + keepalive |
| `utf8mb4` default | Emoji-safe |

### 13.1 Connection Settings (`lib/db/index.ts`)

```ts
mysql.createPool({
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 5,
  idleTimeout: 60_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  timezone: '+00:00',   // store UTC, format in id-ID at the view layer
})
```

The pool is cached on `globalThis` in development to survive hot reloads.

---

**End of DATABASE-SPEC.md v2.0 (MySQL / TiDB Cloud)**
