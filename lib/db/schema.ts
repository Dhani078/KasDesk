import {
  mysqlTable, char, varchar, bigint, decimal, tinyint,
  timestamp, index, uniqueIndex,
} from 'drizzle-orm/mysql-core';

/** 36-char UUID (generated in app layer) */
const pk = (name = 'id') =>
  char(name, { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp('created_at', { fsp: 3 }).notNull().defaultNow();

const updatedAt = () =>
  timestamp('updated_at', { fsp: 3 }).notNull().defaultNow().onUpdateNow();

// ───────────────────────────────────────────────────────── users
export const users = mysqlTable('users', {
  id: pk(),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 120 }),
  image: varchar('image', { length: 500 }),
  emailVerified: timestamp('email_verified', { fsp: 3 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  locale: varchar('locale', { length: 8 }).notNull().default('id-ID'),
  currency: char('currency', { length: 3 }).notNull().default('IDR'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('users_email_uq').on(t.email),
]);

// ──────────────────────────────────────────────────────── accounts
export const accounts = mysqlTable('accounts', {
  id: pk(),
  userId: char('user_id', { length: 36 }).notNull(),
  provider: varchar('provider', { length: 32 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  accessToken: varchar('access_token', { length: 1000 }),
  refreshToken: varchar('refresh_token', { length: 1000 }),
  expiresAt: bigint('expires_at', { mode: 'number' }),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('accounts_provider_uq').on(t.provider, t.providerAccountId),
  index('accounts_user_idx').on(t.userId),
]);

// ─────────────────────────────────────────────────────── sessions
export const sessions = mysqlTable('sessions', {
  id: pk(),
  userId: char('user_id', { length: 36 }).notNull(),
  sessionToken: varchar('session_token', { length: 255 }).notNull(),
  expires: timestamp('expires', { fsp: 3 }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('sessions_token_uq').on(t.sessionToken),
  index('sessions_user_idx').on(t.userId),
]);

// ────────────────────────────────────────────────────── categories
export const categories = mysqlTable('categories', {
  id: pk(),
  userId: char('user_id', { length: 36 }).notNull(),
  name: varchar('name', { length: 32 }).notNull(),
  kind: varchar('kind', { length: 8 }).notNull(),
  sortOrder: tinyint('sort_order').notNull().default(0),
  isSystem: tinyint('is_system').notNull().default(0),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex('categories_user_name_uq').on(t.userId, t.name),
  index('categories_user_idx').on(t.userId),
]);

// ───────────────────────────────────────────────────────── wallets
export const wallets = mysqlTable('wallets', {
  id: pk(),
  userId: char('user_id', { length: 36 }).notNull(),
  name: varchar('name', { length: 60 }).notNull(),
  type: varchar('type', { length: 12 }).notNull(),
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  isArchived: tinyint('is_archived').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('wallets_user_idx').on(t.userId),
  index('wallets_user_archived_idx').on(t.userId, t.isArchived),
]);

// ──────────────────────────────────────────────────── transactions
export const transactions = mysqlTable('transactions', {
  id: pk(),
  userId: char('user_id', { length: 36 }).notNull(),
  walletId: char('wallet_id', { length: 36 }).notNull(),
  toWalletId: char('to_wallet_id', { length: 36 }),
  type: varchar('type', { length: 8 }).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  title: varchar('title', { length: 120 }).notNull(),
  categoryTag: varchar('category_tag', { length: 32 }),
  note: varchar('note', { length: 500 }),
  occurredAt: timestamp('occurred_at', { fsp: 3 }).notNull().defaultNow(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('tx_user_date_idx').on(t.userId, t.occurredAt),
  index('tx_wallet_date_idx').on(t.walletId, t.occurredAt),
  index('tx_user_wallet_idx').on(t.userId, t.walletId),
]);

// ────────────────────────────────────────────────────────── vaults
export const vaults = mysqlTable('vaults', {
  id: pk(),
  userId: char('user_id', { length: 36 }).notNull(),
  name: varchar('name', { length: 80 }).notNull(),
  targetAmount: bigint('target_amount', { mode: 'number' }).notNull(),
  currentAmount: bigint('current_amount', { mode: 'number' }).notNull().default(0),
  targetDate: timestamp('target_date', { fsp: 3 }),
  isCompleted: tinyint('is_completed').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('vaults_user_idx').on(t.userId),
]);

// ─────────────────────────────────────────────────────────── debts
export const debts = mysqlTable('debts', {
  id: pk(),
  userId: char('user_id', { length: 36 }).notNull(),
  direction: varchar('direction', { length: 8 }).notNull(),
  personName: varchar('person_name', { length: 80 }).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  paidAmount: bigint('paid_amount', { mode: 'number' }).notNull().default(0),
  isPaid: tinyint('is_paid').notNull().default(0),
  note: varchar('note', { length: 500 }),
  dueDate: timestamp('due_date', { fsp: 3 }),
  settledAt: timestamp('settled_at', { fsp: 3 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index('debts_user_idx').on(t.userId),
  index('debts_user_open_idx').on(t.userId, t.isPaid),
]);

export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Vault = typeof vaults.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type Category = typeof categories.$inferSelect;
