import { LoginForm } from './LoginForm'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'
import { isGoogleEnabled } from '@/lib/auth/google-enabled'

/**
 * Server component: resolves the Google feature flag server-side so the
 * client never receives the OAuth secret  only a boolean.
 *
 * Rendered per-request, not at build time: `isGoogleEnabled()` reads
 * process.env, and a statically prerendered page would bake in whatever
 * the flag happened to be during `next build` — so filling in the
 * credentials later would never surface the button.
 */
export const dynamic = 'force-dynamic'
export default function LoginPage() {
  const googleEnabled = isGoogleEnabled()

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="surface-card mx-auto w-full max-w-md rounded-3xl p-6 sm:p-8">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">KASDESK</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Selamat datang kembali</h1>
        <p className="mb-8 mt-2 text-sm leading-6 text-text-secondary">Kelola uang dengan tenang dan terukur.</p>

        <LoginForm />

        {googleEnabled && (
          <>
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-text-secondary">atau</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <GoogleSignInButton />
          </>
        )}

        <p className="mt-6 text-center text-sm text-text-secondary">
          Belum punya akun?{' '}
          <a href="/register" className="text-accent hover:underline">
            Daftar
          </a>
        </p>
      </div>
    </main>
  )
}
