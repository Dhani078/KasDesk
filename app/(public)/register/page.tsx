import { RegisterForm } from './RegisterForm'
import { GoogleSignInButton } from '@/components/GoogleSignInButton'
import { isGoogleEnabled } from '@/lib/auth/google-enabled'

/** Server component: resolves the Google flag server-side (no secret to client).
 *
 * Rendered per-request: `isGoogleEnabled()` reads process.env, and a
 * statically prerendered page would bake in the build-time value, so
 * filling in credentials later would never surface the button.
 */
export const dynamic = 'force-dynamic'
export default function RegisterPage() {
  const googleEnabled = isGoogleEnabled()

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="surface-card mx-auto w-full max-w-md rounded-3xl p-6 sm:p-8">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">KASDESK</p>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Mulai lebih teratur</h1>
        <p className="mb-8 mt-2 text-sm leading-6 text-text-secondary">Buat ruang aman untuk keputusan finansialmu.</p>

        <RegisterForm />

        {googleEnabled && (
          <>
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-text-secondary">atau</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <GoogleSignInButton label="Daftar dengan Google" />
          </>
        )}

        <p className="mt-6 text-center text-sm text-text-secondary">
          Sudah punya akun?{' '}
          <a href="/login" className="text-accent hover:underline">
            Masuk
          </a>
        </p>
      </div>
    </main>
  )
}
