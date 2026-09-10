'use server'

import { AuthError } from 'next-auth'
import { signIn, signOut } from '@/auth'
import { registerUser } from '@/auth'
import { registerSchema, loginSchema } from '@/lib/schemas'

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

  try {
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
