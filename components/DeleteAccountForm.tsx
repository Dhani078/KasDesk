'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { deleteAccountAction, type DeleteAccountState } from '@/lib/account/actions'

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flex items-center justify-center gap-2 rounded-xl bg-danger px-5 py-3 font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {pending ? 'Menghapus akun permanen…' : 'Hapus Akun Permanen'}
    </button>
  )
}

export function DeleteAccountForm() {
  const [state, formAction] = useActionState<DeleteAccountState, FormData>(deleteAccountAction, null)
  const [confirmation, setConfirmation] = useState('')

  const isConfirmed = confirmation.trim() === 'HAPUS AKUN'

  return (
    <form action={formAction} className="mt-4 space-y-3.5">
      <div>
        <label htmlFor="delete-confirm" className="mb-1 block text-xs text-text-secondary">
          Konfirmasi penghapusan: ketik <b className="text-danger tracking-wider">HAPUS AKUN</b> di bawah ini
        </label>
        <div className="relative">
          <input
            id="delete-confirm"
            name="confirmation"
            autoComplete="off"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Ketik HAPUS AKUN"
            className="w-full rounded-xl border border-danger/40 bg-canvas px-4 py-3 font-mono text-sm tracking-wide text-text-primary outline-none focus:border-danger"
          />
          {isConfirmed && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-danger">
              ✓ Sesuai
            </span>
          )}
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2 text-xs font-medium text-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="pt-1">
        <Submit disabled={!isConfirmed} />
      </div>
    </form>
  )
}
