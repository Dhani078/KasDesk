'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { loginAction, type AuthFormState } from '@/lib/auth/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-accent-solid px-4 py-3 font-semibold text-white transition disabled:opacity-60"
    >
      {pending ? 'Masuk…' : 'Masuk'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, null)

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">KASDESK</h1>
        <p className="mb-8 text-sm text-text-secondary">Masuk untuk melanjutkan</p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-text-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-text-secondary">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text-primary outline-none focus:border-accent"
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}

          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Belum punya akun?{' '}
          <Link href="/register" className="text-accent hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </main>
  )
}
