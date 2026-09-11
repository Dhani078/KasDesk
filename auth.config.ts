import type { NextAuthConfig } from 'next-auth'

/**
 * Edge-safe half of the Auth.js config.
 *
 * SECURITY: imported by `auth.edge.ts`, which runs on the Edge runtime.
 * It must NOT import bcryptjs or the mysql2 driver  both are Node-only
 * and would break the middleware build. The Credentials `authorize`
 * callback therefore lives in `auth.ts`, which is Node-only.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    /** Persist the user id onto the JWT so it survives to the session. */
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    /** Expose the id on `session.user.id` for Server Actions to consume. */
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      session.issuedAt = typeof token.iat === 'number' ? token.iat : 0
      return session
    },
  },
  // Only providers that work on the Edge live here.
  // `Credentials` is added in `auth.ts` because `authorize` needs Node.
  // Google OAuth is intentionally disabled until its local-user mapping and
  // account-linking flow have dedicated integration tests.
  providers: [],

} satisfies NextAuthConfig
