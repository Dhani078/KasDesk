import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'

import { authConfig } from './auth.config'
import { db } from '@/lib/db'
import { users, categories, wallets } from '@/lib/db/schema'
import { verifyPassword } from '@/lib/auth/password'
import { registerSchema } from '@/lib/schemas'

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
 * Seed a brand-new user with a default wallet and the system categories.
 * Called by `registerUser` and the `signIn` safety net below.
 */
export async function seedNewUser(userId: string, name?: string | null) {
  await db.insert(wallets).values({
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

  await db.insert(categories).values(
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

  const id = crypto.randomUUID()
  await db.insert(users).values({
    id,
    email,
    name: parsed.data.name ?? null,
    passwordHash: await hashPasswordSafe(parsed.data.password),
    locale: 'id-ID',
    currency: 'IDR',
  })

  await seedNewUser(id, parsed.data.name)
  return { id }
}

// Imported lazily so the Edge bundle never sees bcryptjs.
async function hashPasswordSafe(plain: string): Promise<string> {
  const { hashPassword } = await import('@/lib/auth/password')
  return hashPassword(plain)
}
