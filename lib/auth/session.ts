import { auth } from '@/auth'

/**
 * Resolve the signed-in user id, or null when unauthenticated.
 *
 * Every Server Action must call this and then scope its query with
 * `eq(table.userId, userId)`. MySQL has no Row Level Security, so this
 * check is the ONLY thing preventing cross-user data access.
 */
export async function requireUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * Same as `requireUserId` but throws when unauthenticated.
 * Use in actions where a missing session is a programming error.
 */
export async function assertUserId(): Promise<string> {
  const id = await requireUserId()
  if (!id) throw new Error('UNAUTHENTICATED')
  return id
}
