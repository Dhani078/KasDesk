import {
  mysqlTable, char, varchar, bigint, tinyint,
  timestamp, index, uniqueIndex,
} from 'drizzle-orm/mysql-core';

/**
 * Column naming: camelCase, matching the live TiDB tables exactly.
 *
 * IMPORTANT: these string arguments are the REAL column names in MySQL.
 * Drizzle maps the TypeScript key (left) to this string (right). They were
 * once snake_case while the migration SQL created camelCase tables, which
 * made every query fail with "Unknown column 'user_id'". Always keep these
 * in sync with `drizzle/0000_init.sql`.
 */

/** 36-char UUID (generated in app layer) */
const pk = (name = 'id') =>
  char(name, { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp('createdAt', { fsp: 3 }).notNull().defaultNow();

const updatedAt = () =>
  timestamp('updatedAt', { fsp: 3 }).notNull().defaultNow().onUpdateNow();

// ───────────────────────────────────────────────────────── users
export const users = mysqlTable('users', {
  id: pk(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }),
  image: varchar('image', { length: 500 }),
  emailVerified: timestamp('emailVerified', { fsp: 3 }),
  passwordHash: varchar('passwordHash', { length: 255 }),
  locale: varchar('locale', { length: 8 }).notNull().default('id-ID'),
  currency: char('currency', { length: 3 }).notNull().default('IDR'),
  sessionInvalidBefore: timestamp('sessionInvalidBefore', { fsp: 3 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('users_email_uq').on(t.email),
]);

// ──────────────────────────────────────────────────────── accounts
export const accounts = mysqlTable('accounts', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  provider: varchar('provider', { length: 32 }).notNull(),
  providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
  accessToken: varchar('accessToken', { length: 1000 }),
  refreshToken: varchar('refreshToken', { length: 1000 }),
  expiresAt: bigint('expiresAt', { mode: 'number' }),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('accounts_provider_uq').on(t.provider, t.providerAccountId),
  index('accounts_user_idx').on(t.userId),
]);

// ─────────────────────────────────────────────────────── sessions
export const sessions = mysqlTable('sessions', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  sessionToken: varchar('sessionToken', { length: 255 }).notNull(),
  expires: timestamp('expires', { fsp: 3 }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('sessions_token_uq').on(t.sessionToken),
  index('sessions_user_idx').on(t.userId),
]);

// ────────────────────────────────────────────────────── categories
export const categories = mysqlTable('categories', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  name: varchar('name', { length: 32 }).notNull(),
  kind: varchar('kind', { length: 8 }).notNull(),
  sortOrder: tinyint('sortOrder').notNull().default(0),
  isSystem: tinyint('isSystem').notNull().default(0),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('categories_user_name_uq').on(t.userId, t.name),
  index('categories_user_idx').on(t.userId),
]);

// ───────────────────────────────────────────────────────── wallets
export const wallets = mysqlTable('wallets', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  name: varchar('name', { length: 60 }).notNull(),
  type: varchar('type', { length: 12 }).notNull(),
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  isArchived: tinyint('isArchived').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('wallets_user_idx').on(t.userId),
  index('wallets_user_archived_idx').on(t.userId, t.isArchived),
]);

// ──────────────────────────────────────────────────── transactions
export const transactions = mysqlTable('transactions', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  walletId: char('walletId', { length: 36 }).notNull(),
  toWalletId: char('toWalletId', { length: 36 }),
  type: varchar('type', { length: 8 }).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  title: varchar('title', { length: 120 }).notNull(),
  categoryTag: varchar('categoryTag', { length: 32 }),
  note: varchar('note', { length: 500 }),
  occurredAt: timestamp('occurredAt', { fsp: 3 }).notNull().defaultNow(),
  createdAt: createdAt(),
  clientMutationId: char('clientMutationId', { length: 36 }),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('tx_user_client_mutation_uq').on(t.userId, t.clientMutationId),
  index('tx_user_date_idx').on(t.userId, t.occurredAt),
  index('tx_wallet_date_idx').on(t.walletId, t.occurredAt),
  index('tx_user_wallet_idx').on(t.userId, t.walletId),
]);

// ────────────────────────────────────────────────────────── vaults
export const vaults = mysqlTable('vaults', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  name: varchar('name', { length: 80 }).notNull(),
  targetAmount: bigint('targetAmount', { mode: 'number' }).notNull(),
  currentAmount: bigint('currentAmount', { mode: 'number' }).notNull().default(0),
  targetDate: timestamp('targetDate', { fsp: 3 }),
  isCompleted: tinyint('isCompleted').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('vaults_user_idx').on(t.userId),
]);

// ─────────────────────────────────────────────────────────── debts
export const debts = mysqlTable('debts', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  direction: varchar('direction', { length: 8 }).notNull(),
  personName: varchar('personName', { length: 80 }).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  paidAmount: bigint('paidAmount', { mode: 'number' }).notNull().default(0),
  isPaid: tinyint('isPaid').notNull().default(0),
  note: varchar('note', { length: 500 }),
  dueDate: timestamp('dueDate', { fsp: 3 }),
  settledAt: timestamp('settledAt', { fsp: 3 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('debts_user_idx').on(t.userId),
  index('debts_user_open_idx').on(t.userId, t.isPaid),
]);

// ───────────────────────────────────────────────────────── budgets
export const budgets = mysqlTable('budgets', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  month: char('month', { length: 7 }).notNull(),
  categoryTag: varchar('categoryTag', { length: 32 }).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('budgets_user_month_category_uq').on(t.userId, t.month, t.categoryTag),
  index('budgets_user_month_idx').on(t.userId, t.month),
]);

// ───────────────────────────────────────────────── recurring reminders
export const recurringRules = mysqlTable('recurringRules', {
  id: pk(),
  userId: char('userId', { length: 36 }).notNull(),
  title: varchar('title', { length: 120 }).notNull(),
  type: varchar('type', { length: 8 }).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  categoryTag: varchar('categoryTag', { length: 32 }),
  frequency: varchar('frequency', { length: 12 }).notNull(),
  nextRunAt: timestamp('nextRunAt', { fsp: 3 }).notNull(),
  isActive: tinyint('isActive').notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('recurring_user_next_idx').on(t.userId, t.nextRunAt),
]);

export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Vault = typeof vaults.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
