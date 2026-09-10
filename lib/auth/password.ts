import bcrypt from 'bcryptjs'

const ROUNDS = 12

/** Hash a plaintext password. Never log the input or the output. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

/**
 * Verify a plaintext password against a stored hash.
 *
 * SECURITY: runs a dummy comparison when no hash exists, so that a missing
 * account takes the same time as a wrong password.
 */
export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin')
    return false
  }
  return bcrypt.compare(plain, hash)
}
