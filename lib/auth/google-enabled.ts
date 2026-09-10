/**
 * Feature flag for Google OAuth.
 *
 * `auth.config.ts` registers the Google provider only when both env vars
 * are present. The UI must ask the same question, otherwise it would show
 * a button that can never work.
 *
 * Deliberately NOT in `lib/auth/actions.ts`: that file is `'use server'`,
 * where every export must be an async function. This one is sync and is
 * evaluated during server rendering, so it needs its own module.
 *
 * Only the boolean crosses to the client — the secret itself never does.
 */
export function isGoogleEnabled(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
}
