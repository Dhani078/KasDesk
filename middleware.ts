import { edgeAuth } from '@/auth.edge'
import { NextResponse } from 'next/server'

/**
 * Route protection.
 *
 * Uses the Edge-safe `auth.config.ts` (via `@/auth`'s exported `auth`
 * wrapper) so no Node-only dependency is pulled into the Edge bundle.
 */
export default edgeAuth((req) => {
  const isLoggedIn = !!req.auth?.user?.id
  const { pathname } = req.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isApiAuth = pathname.startsWith('/api/auth')

  if (isApiAuth) return NextResponse.next()

  // Send signed-in users away from the auth screens.
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Everything else requires a session.
  if (!isAuthRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  // Exclude static assets and PWA files from the auth check.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*).*)'],
}
