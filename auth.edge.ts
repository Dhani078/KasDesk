import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

/**
 * Edge-safe Auth.js instance for middleware only.
 *
 * SECURITY NOTE: this deliberately builds a SECOND NextAuth instance from
 * `authConfig` instead of importing `@/auth`. The main instance pulls in
 * bcryptjs and the mysql2 driver, neither of which can run on the Edge
 * runtime. Middleware only needs to read the JWT, so it uses this
 * dependency-free version. Both instances share AUTH_SECRET, so a session
 * cookie issued by one validates in the other.
 */
export const { auth: edgeAuth } = NextAuth(authConfig)
