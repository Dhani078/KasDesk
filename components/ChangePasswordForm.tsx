'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { changePasswordAction, type ChangePasswordState } from '@/lib/account/actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 rounded-xl bg-accent-solid px-5 py-3 font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
      {pending ? 'Mengubah password…' : 'Simpan Password Baru'}
    </button>
  )
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(changePasswordAction, null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  return (
    <form action={formAction} className="mt-4 space-y-3.5">
      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-xs text-text-secondary">
          Password Saat Ini
        </label>
        <div className="relative">
          <input
            id="currentPassword"
            name="currentPassword"
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Masukkan password lama"
            className="w-full rounded-xl border border-border bg-canvas px-4 py-3 pr-11 text-sm text-text-primary outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-text-secondary hover:text-text-primary"
            aria-label={showCurrent ? 'Sembunyikan password' : 'Lihat password'}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1 block text-xs text-text-secondary">
          Password Baru (minimal 8 karakter)
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            placeholder="Minimal 8 karakter"
            className="w-full rounded-xl border border-border bg-canvas px-4 py-3 pr-11 text-sm text-text-primary outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-text-secondary hover:text-text-primary"
            aria-label={showNew ? 'Sembunyikan password' : 'Lihat password'}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-medium text-danger">
          {state.error}
        </p>
      )}

      <div className="pt-1">
        <Submit />
      </div>
    </form>
  )
}
