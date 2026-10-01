import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, categories, wallets } from '@/lib/db/schema'
import { registerSchema } from '@/lib/schemas'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

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
  // land together in one atomic transaction.
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

async function hashPasswordSafe(plain: string): Promise<string> {
  const { hashPassword } = await import('@/lib/auth/password')
  return hashPassword(plain)
}
