/** Minimal session helper. Replace with Auth.js once wired (see SECURITY-SPEC §5). */
import { cookies } from 'next/headers'

export async function requireUserId(): Promise<string | null> {
  const store = await cookies()
  const uid = store.get('kd_uid')?.value
  return uid ?? null
}
