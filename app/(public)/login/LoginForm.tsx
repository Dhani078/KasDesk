'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction, type AuthFormState } from '@/lib/auth/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-accent-solid px-4 py-3 font-semibold text-white min-h-12 transition hover:brightness-110 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Masuk…' : 'Masuk'}
    </button>
  )
}

/** Client half of the login page (the form needs `useActionState`). */
export function LoginForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, null)

  return (
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
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
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
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text-primary outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
