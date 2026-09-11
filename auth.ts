import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'

import { authConfig } from './auth.config'
import { db } from '@/lib/db'
import { users, categories, wallets } from '@/lib/db/schema'
import { verifyPassword } from '@/lib/auth/password'
import { clearDistributedRateLimit } from '@/lib/auth/distributed-rate-limit'
import { registerSchema } from '@/lib/schemas'

/**
 * The handle drizzle passes into `db.transaction(async (tx) => ...)`.
 *
 * Typed from the real callback parameter so it stays correct if the schema or
 * drizzle version changes. `seedNewUser` accepts one so the caller can run it
 * inside the same transaction as the user insert.
 */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Node-runtime Auth.js instance. Used by Server Components, Server
 * Actions and the route handler  never by middleware (see `auth.edge.ts`).
 *
 * The Credentials provider is attached here rather than in `auth.config.ts`
 * because `authorize` needs bcryptjs and the database, both Node-only.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? '').trim().toLowerCase()
        const password = String(creds?.password ?? '')

        if (!email || !password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (!user) return null
        if (!(await verifyPassword(password, user.passwordHash))) return null

        // Clear only after successful credential verification.
        await clearDistributedRateLimit('login', email)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
})

/**
 * Give a brand-new user a starter wallet and the system categories.
 *
 * `tx` lets the caller run this inside the same transaction as the user
 * insert — see registerUser(). When omitted it runs on its own connection.
 */
export async function seedNewUser(
  userId: string,
  name?: string | null,
  tx?: Tx,
) {
  const exec = (tx ?? db) as typeof db
  await exec.insert(wallets).values({
    userId,
    name: 'Tunai',
    type: 'cash',
    balance: 0,
  })

  const system = [
    { name: 'MAKAN', kind: 'expense', sortOrder: 1 },
    { name: 'TRANSPORT', kind: 'expense', sortOrder: 2 },
    { name: 'BELANJA', kind: 'expense', sortOrder: 3 },
    { name: 'TAGIHAN', kind: 'expense', sortOrder: 4 },
    { name: 'HIBURAN', kind: 'expense', sortOrder: 5 },
    { name: 'KESEHATAN', kind: 'expense', sortOrder: 6 },
    { name: 'PENDIDIKAN', kind: 'expense', sortOrder: 7 },
    { name: 'LAINNYA', kind: 'both', sortOrder: 8 },
    { name: 'GAJI', kind: 'income', sortOrder: 9 },
  ]

  await exec.insert(categories).values(
    system.map((c) => ({
      userId,
      name: c.name,
      kind: c.kind,
      sortOrder: c.sortOrder,
      isSystem: 1,
    })),
  )
}

/**
 * Register a new user with email + password.
 * Returns the new user id, or null if the email is already taken.
 */
export async function registerUser(input: {
  email: string
  password: string
  name?: string
}): Promise<{ id: string } | null> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) return null

  const email = parsed.data.email.toLowerCase()
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (existing) return null

  // Password hashing happens outside the transaction: bcrypt is slow, and
  // holding a DB transaction open across it would keep a connection busy for
  // ~100ms under load.
  const passwordHash = await hashPasswordSafe(parsed.data.password)
  const id = crypto.randomUUID()

  // The user row and its seed data (starter wallet + system categories) must
  // land together. Previously these were two separate inserts: a failure in
  // between created a user who could log in but had no wallet and no
  // categories — permanently broken, because nothing ever re-runs the seed.
  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      email,
      name: parsed.data.name ?? null,
      passwordHash,
      locale: 'id-ID',
      currency: 'IDR',
    })

    await seedNewUser(id, parsed.data.name, tx)
  })

  return { id }
}

// Imported lazily so the Edge bundle never sees bcryptjs.
async function hashPasswordSafe(plain: string): Promise<string> {
  const { hashPassword } = await import('@/lib/auth/password')
  return hashPassword(plain)
}
