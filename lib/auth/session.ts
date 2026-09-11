import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export async function requireUserId(): Promise<string | null> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  const [user] = await db.select({ id: users.id, invalidBefore: users.sessionInvalidBefore }).from(users).where(eq(users.id, id)).limit(1)
  if (!user) return null
  if (user.invalidBefore && (session.issuedAt ?? 0) * 1000 < user.invalidBefore.getTime()) return null
  return user.id
}

export async function assertUserId(): Promise<string> {
  const id = await requireUserId()
  if (!id) throw new Error('UNAUTHENTICATED')
  return id
}
