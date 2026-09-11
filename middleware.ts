import { edgeAuth } from '@/auth.edge'
import { NextResponse } from 'next/server'

export default edgeAuth((req) => {
  const isLoggedIn = Boolean(req.auth?.user?.id)
  const { pathname } = req.nextUrl
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isPublicRoute = pathname === '/welcome' || pathname === '/privacy' || pathname === '/terms' || pathname === '/api/health'
  const isApiAuth = pathname.startsWith('/api/auth')

  if (isApiAuth || isPublicRoute) {
    if (pathname === '/welcome' && isLoggedIn) return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  }

  if (isAuthRoute) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  }

  if (!isLoggedIn) return NextResponse.redirect(new URL('/welcome', req.url))
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|workbox-.*).*)'],
}
