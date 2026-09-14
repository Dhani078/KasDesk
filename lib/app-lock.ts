'use client'

const STORAGE_KEY_ENABLED = 'kasdesk:lock_enabled'
const STORAGE_KEY_HASH = 'kasdesk:lock_hash'
const STORAGE_KEY_SALT = 'kasdesk:lock_salt'
const STORAGE_KEY_BIO_ENABLED = 'kasdesk:bio_enabled'
const STORAGE_KEY_BIO_CRED_ID = 'kasdesk:bio_cred_id'
const SESSION_KEY_UNLOCKED = 'kasdesk:unlocked'

export function isAppLockConfigured(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true' && !!localStorage.getItem(STORAGE_KEY_HASH)
}

export function isAppSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return true
  if (!isAppLockConfigured()) return true
  return sessionStorage.getItem(SESSION_KEY_UNLOCKED) === 'true'
}

export function setAppSessionUnlocked(unlocked: boolean) {
  if (typeof window === 'undefined') return
  if (unlocked) {
    sessionStorage.setItem(SESSION_KEY_UNLOCKED, 'true')
  } else {
    sessionStorage.removeItem(SESSION_KEY_UNLOCKED)
  }
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(`${salt}:${pin}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function generateSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function saveNewPin(pin: string): Promise<void> {
  if (typeof window === 'undefined') return
  const salt = generateSalt()
  const hash = await hashPin(pin, salt)
  localStorage.setItem(STORAGE_KEY_SALT, salt)
  localStorage.setItem(STORAGE_KEY_HASH, hash)
  localStorage.setItem(STORAGE_KEY_ENABLED, 'true')
  setAppSessionUnlocked(true)
}

export async function verifyEnteredPin(pin: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const salt = localStorage.getItem(STORAGE_KEY_SALT)
  const expectedHash = localStorage.getItem(STORAGE_KEY_HASH)
  if (!salt || !expectedHash) return false
  const hash = await hashPin(pin, salt)
  const valid = hash === expectedHash
  if (valid) {
    setAppSessionUnlocked(true)
  }
  return valid
}

export function removeAppLock() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_ENABLED)
  localStorage.removeItem(STORAGE_KEY_HASH)
  localStorage.removeItem(STORAGE_KEY_SALT)
  localStorage.removeItem(STORAGE_KEY_BIO_ENABLED)
  localStorage.removeItem(STORAGE_KEY_BIO_CRED_ID)
  sessionStorage.removeItem(SESSION_KEY_UNLOCKED)
}

export async function checkBiometricsSupport(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function isBiometricsEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY_BIO_ENABLED) === 'true' && !!localStorage.getItem(STORAGE_KEY_BIO_CRED_ID)
}

export async function registerBiometrics(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!window.PublicKeyCredential) return false
  try {
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const userId = new Uint8Array(16)
    crypto.getRandomValues(userId)

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'KASDESK' },
        user: {
          id: userId,
          name: 'user@kasdesk.local',
          displayName: 'Pengguna KasDesk',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          requireResidentKey: false,
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null

    if (credential && credential.rawId) {
      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
      localStorage.setItem(STORAGE_KEY_BIO_CRED_ID, credId)
      localStorage.setItem(STORAGE_KEY_BIO_ENABLED, 'true')
      return true
    }
    return false
  } catch (err) {
    console.warn('Biometric setup failed or cancelled:', err)
    return false
  }
}

export async function authenticateBiometrics(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!isBiometricsEnabled()) return false
  try {
    const credIdStr = localStorage.getItem(STORAGE_KEY_BIO_CRED_ID)
    if (!credIdStr) return false

    const rawIdStr = atob(credIdStr)
    const rawId = new Uint8Array(rawIdStr.length)
    for (let i = 0; i < rawIdStr.length; i++) {
      rawId[i] = rawIdStr.charCodeAt(i)
    }

    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: rawId }],
        userVerification: 'required',
        timeout: 60000,
      },
    })

    if (assertion) {
      setAppSessionUnlocked(true)
      return true
    }
    return false
  } catch (err) {
    console.warn('Biometric auth failed or cancelled:', err)
    return false
  }
}

export function setBiometricsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  if (!enabled) {
    localStorage.removeItem(STORAGE_KEY_BIO_ENABLED)
    localStorage.removeItem(STORAGE_KEY_BIO_CRED_ID)
  }
}
