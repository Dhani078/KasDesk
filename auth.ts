import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'

import { authConfig } from './auth.config'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { verifyPassword } from '@/lib/auth/password'
import { clearDistributedRateLimit } from '@/lib/auth/distributed-rate-limit'

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

export { seedNewUser, registerUser } from '@/lib/auth/register'
