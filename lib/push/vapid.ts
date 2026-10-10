import crypto from 'crypto'

/**
 * Native Node.js RFC 8292 & RFC 8291 Web Push VAPID implementation.
 * Zero external dependencies — uses only Node.js stdlib `crypto`.
 */

// Fallback development/staging VAPID keypair if not configured in environment
const DEFAULT_VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BNx6nBoBb9IuLI8wCDMHDCOcg_-3JzgQs8CDd1knEcJkMzAH3GTsE3LFY8ZTSl8mrFEqAQhAMpV_e14-TiRPbmM'
const DEFAULT_VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ||
  'MzAH3GTsE3LFY8ZTSl8mrFEqAQhAMpV_e14-TiRPbmM'

export function getVapidKeys() {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC,
    privateKey: process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE,
    subject: process.env.VAPID_SUBJECT || 'mailto:support@kasdesk.id',
  }
}

/**
 * Creates RFC 8292 VAPID Authorization header (ES256 signed JWT).
 */
export function createVapidHeader(endpoint: string): { Authorization: string; 'Crypto-Key'?: string } {
  const { publicKey, privateKey, subject } = getVapidKeys()
  const endpointUrl = new URL(endpoint)
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`

  const header = { typ: 'JWT', alg: 'ES256' }
  const claims = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600, // 12 hours
    sub: subject,
  }

  const b64UrlHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const b64UrlClaims = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const unsignedToken = `${b64UrlHeader}.${b64UrlClaims}`

  // Format private key into PKCS#8 PEM or derive from raw 32-byte scalar
  const privKeyDer = Buffer.from(privateKey, 'base64url')
  // PKCS#8 DER prefix for prime256v1 private key
  const pkcs8Prefix = Buffer.from('3041020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420', 'hex')
  const fullPrivDer = Buffer.concat([pkcs8Prefix, privKeyDer.subarray(0, 32)])

  const privKeyObject = crypto.createPrivateKey({
    key: fullPrivDer,
    format: 'der',
    type: 'pkcs8',
  })

  const signature = crypto.sign('sha256', Buffer.from(unsignedToken, 'utf8'), {
    key: privKeyObject,
    dsaEncoding: 'ieee-p1363', // 64 bytes raw (r || s)
  })

  const jwt = `${unsignedToken}.${signature.toString('base64url')}`

  return {
    Authorization: `vapid t=${jwt}, k=${publicKey}`,
  }
}

/**
 * Encrypts payload buffer using RFC 8291 (aes128gcm) for Web Push delivery.
 */
export function encryptWebPushPayload(
  payloadText: string,
  p256dhBase64: string,
  authBase64: string
): { body: Buffer; headers: Record<string, string> } {
  const clientPublicKey = Buffer.from(p256dhBase64, 'base64url')
  const authSecret = Buffer.from(authBase64, 'base64url')

  const serverEcdh = crypto.createECDH('prime256v1')
  serverEcdh.generateKeys()
  const serverPublicKey = serverEcdh.getPublicKey()
  const sharedSecret = serverEcdh.computeSecret(clientPublicKey)

  const salt = crypto.randomBytes(16)

  // RFC 8291 Info context
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'utf8'),
    clientPublicKey,
    serverPublicKey,
  ])

  const prk = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32))
  const cek = Buffer.from(crypto.hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'utf8'), 16))
  const nonce = Buffer.from(crypto.hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: nonce\0', 'utf8'), 12))

  const payloadBuf = Buffer.from(payloadText, 'utf8')
  // Append record delimiter 0x02
  const record = Buffer.concat([payloadBuf, Buffer.from([2])])

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const ciphertext = Buffer.concat([cipher.update(record), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Build aes128gcm header (RFC 8291 section 4)
  const rs = Buffer.alloc(4)
  rs.writeUInt32BE(4096, 0)

  const header = Buffer.concat([
    salt,
    rs,
    Buffer.from([serverPublicKey.length]),
    serverPublicKey,
  ])

  const body = Buffer.concat([header, ciphertext, authTag])

  return {
    body,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '86400',
    },
  }
}

/**
 * Sends a native Web Push notification to a browser push endpoint.
 */
export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ success: boolean; statusCode: number }> {
  try {
    const vapidHeaders = createVapidHeader(subscription.endpoint)
    const { body, headers } = encryptWebPushPayload(
      JSON.stringify(payload),
      subscription.p256dh,
      subscription.auth
    )

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        ...vapidHeaders,
        ...headers,
      },
      body: new Uint8Array(body),
    })

    return {
      success: response.ok,
      statusCode: response.status,
    }
  } catch (err) {
    console.error('[sendWebPush Error]', err)
    return {
      success: false,
      statusCode: 500,
    }
  }
}
