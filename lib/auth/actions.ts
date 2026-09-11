'use server'

import { AuthError } from 'next-auth'
import { signIn, signOut } from '@/auth'
import { registerUser } from '@/auth'
import { registerSchema, loginSchema } from '@/lib/schemas'
import { checkDistributedRateLimit } from '@/lib/auth/distributed-rate-limit'
import { isGoogleEnabled } from '@/lib/auth/google-enabled'

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
  const key = parsed.data.email.toLowerCase()
  const gate = await checkDistributedRateLimit('login', key)
  if (!gate.ok) {
    const min = Math.ceil(gate.retryAfterSec / 60)
    return {
      error: `Terlalu banyak percobaan. Coba lagi dalam ${min} menit.`,
    }
  }

  try {
    // The counter is cleared inside Credentials.authorize only after the
    // password has been verified. Clearing it here would disable throttling.
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

  // Per-address and process-wide budgets: never bucket an entire email domain,
  // which would let a few attempts lock out every Gmail/Outlook user.
  const addressGate = await checkDistributedRateLimit('register', parsed.data.email.toLowerCase())
  const globalGate = await checkDistributedRateLimit('register-global', 'all', 60, 60)
  if (!addressGate.ok || !globalGate.ok) {
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

/** Start the Google OAuth flow. Only valid when `isGoogleEnabled()`. */
export async function googleSignInAction() {
  if (!isGoogleEnabled()) return
  await signIn('google', { redirectTo: '/' })
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}
