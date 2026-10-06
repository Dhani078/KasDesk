/**
 * Client-Side Zero-Knowledge Encrypted Backup & Restore (PRD v2.0 §3.9).
 * Uses native Web Crypto API (PBKDF2 100k iters + AES-256-GCM).
 * Guarantees zero secret exposure: passphrase never touches the server.
 */

export interface EncryptedBackupContainer {
  format: 'kasdesk-encrypted-backup'
  version: 1
  kdf: 'PBKDF2'
  cipher: 'AES-256-GCM'
  iterations: number
  salt: string // Base64
  iv: string // Base64
  ciphertext: string // Base64
  createdAt: string
}

function getSubtle(): SubtleCrypto {
  const c = typeof window !== 'undefined' ? window.crypto : globalThis.crypto
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API tidak tersedia pada perangkat ini.')
  }
  return c.subtle
}

function getRandomBytes(len: number): Uint8Array {
  const c = typeof window !== 'undefined' ? window.crypto : globalThis.crypto
  const arr = new Uint8Array(len)
  c.getRandomValues(arr)
  return arr
}

function bufferToBase64(buf: ArrayBuffer | ArrayBufferView | ArrayBufferLike): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array('buffer' in buf ? buf.buffer : buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64')
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations = 100_000): Promise<CryptoKey> {
  const subtle = getSubtle()
  const enc = new TextEncoder()
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt arbitrary data with user passphrase into an armored JSON container.
 */
export async function encryptBackup(data: unknown, passphrase: string): Promise<string> {
  if (!passphrase || passphrase.length < 6) {
    throw new Error('Passphrase minimal 6 karakter demi keamanan.')
  }

  const subtle = getSubtle()
  const salt = getRandomBytes(16)
  const iv = getRandomBytes(12) // Recommended 96-bit IV for AES-GCM
  const key = await deriveKey(passphrase, salt, 100_000)

  const enc = new TextEncoder()
  const jsonString = JSON.stringify(data)
  const plaintext = enc.encode(jsonString)

  const ciphertextBuf = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as ArrayBuffer,
    },
    key,
    plaintext,
  )

  const container: EncryptedBackupContainer = {
    format: 'kasdesk-encrypted-backup',
    version: 1,
    kdf: 'PBKDF2',
    cipher: 'AES-256-GCM',
    iterations: 100_000,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBuf),
    createdAt: new Date().toISOString(),
  }

  return JSON.stringify(container, null, 2)
}

/**
 * Decrypt an armored backup container back into original data object.
 * Throws if passphrase is wrong or data is corrupted.
 */
export async function decryptBackup<T = unknown>(containerString: string, passphrase: string): Promise<T> {
  if (!passphrase) {
    throw new Error('Passphrase wajib diisi.')
  }

  let container: EncryptedBackupContainer
  try {
    container = JSON.parse(containerString)
  } catch {
    throw new Error('Format berkas cadangan rusak atau bukan JSON yang valid.')
  }

  if (container.format !== 'kasdesk-encrypted-backup' || container.version !== 1) {
    throw new Error('Format berkas cadangan tidak kompatibel dengan KasDesk.')
  }

  const subtle = getSubtle()
  const salt = new Uint8Array(base64ToBuffer(container.salt))
  const iv = new Uint8Array(base64ToBuffer(container.iv))
  const ciphertext = base64ToBuffer(container.ciphertext)

  const key = await deriveKey(passphrase, salt, container.iterations || 100_000)

  let decryptedBuf: ArrayBuffer
  try {
    decryptedBuf = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as ArrayBuffer,
      },
      key,
      ciphertext,
    )
  } catch {
    throw new Error('Passphrase salah atau berkas telah dimodifikasi (dekripsi gagal).')
  }

  const dec = new TextDecoder()
  const jsonText = dec.decode(decryptedBuf)
  return JSON.parse(jsonText) as T
}
