'use server'

import { AuthError } from 'next-auth'
import { signIn, signOut } from '@/auth'
import { registerUser } from '@/auth'
import { registerSchema, loginSchema } from '@/lib/schemas'
import { checkRateLimit, clearRateLimit } from '@/lib/auth/rate-limit'

export type AuthFormState = { error: string } | null

/** Log in with email + password. Redirects on success. */
export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }
  }

  // Throttle by account, not by IP: rate-limiting the IP would let an
  // attacker lock out a victim by guessing their email.
  const key = `login:${parsed.data.email.toLowerCase()}`
  const gate = checkRateLimit(key)
  if (!gate.ok) {
    const min = Math.ceil(gate.retryAfterSec / 60)
    return {
      error: `Terlalu banyak percobaan. Coba lagi dalam ${min} menit.`,
    }
  }

  try {
    // Success: reset the counter so a legitimate user who fat-fingered
    // their password 8 times isn't still locked out after getting it right.
    clearRateLimit(key)
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/',
    })
    return null
  } catch (e) {
    // signIn throws a redirect on success; only real errors are handled here.
    if (e instanceof AuthError) {
      return { error: 'Email atau password salah' }
    }
    throw e
  }
}

/** Create an account, then sign the new user straight in. */
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Input tidak valid' }
  }

  // Coarse guard against mass account creation. Keyed by email prefix so a
  // script hammering one address cannot exhaust the whole keyspace.
  const gate = checkRateLimit(`register:${parsed.data.email.split('@')[1] ?? 'x'}`)
  if (!gate.ok) {
    return { error: 'Terlalu banyak pendaftaran. Coba lagi nanti.' }
  }

  const created = await registerUser(parsed.data)
  if (!created) {
    return { error: 'Email sudah terdaftar' }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/',
    })
    return null
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: 'Gagal masuk setelah mendaftar. Coba login.' }
    }
    throw e
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}
