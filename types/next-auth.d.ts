import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  /** Adds `id` to `session.user`, which the core types omit. */
  interface Session {
    issuedAt?: number
    user: {
      id: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    /** Stable user id carried across requests. */
    sub?: string
  }
}

export {}
