// F-01: TOTP / 2FA code generation using Web Crypto API (RFC 6238/4226)
// Pure browser implementation — no Node.js Buffer polyfill needed.

/** Decode a base32 string to Uint8Array */
function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = input.replace(/\s/g, '').toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  let index = 0
  const output = new Uint8Array(Math.floor((clean.length * 5) / 8))
  for (const char of clean) {
    const idx = alphabet.indexOf(char)
    if (idx === -1) throw new Error(`Invalid base32 char: ${char}`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff
      bits -= 8
    }
  }
  return output
}

/** HMAC-SHA1 using Web Crypto */
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data)
  return new Uint8Array(sig)
}

/** Generate HOTP code (RFC 4226) */
async function hotp(secret: Uint8Array, counter: number, digits: number): Promise<string> {
  // Pack counter as big-endian 8-byte
  const data = new Uint8Array(8)
  let c = counter
  for (let i = 7; i >= 0; i--) {
    data[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  const hash = await hmacSha1(secret, data)
  const offset = hash[hash.length - 1] & 0x0f
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  return String(code % Math.pow(10, digits)).padStart(digits, '0')
}

/**
 * Generate the current 6-digit TOTP code from a base32 secret.
 * Returns null if the secret is invalid.
 */
export async function generateTOTP(secret: string): Promise<string | null> {
  try {
    const key = base32Decode(secret.replace(/\s/g, '').toUpperCase())
    const counter = Math.floor(Date.now() / 1000 / 30)
    return await hotp(key, counter, 6)
  } catch {
    return null
  }
}

/**
 * Seconds remaining in the current 30-second TOTP window.
 */
export function totpSecondsRemaining(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30)
}

/**
 * Validate a TOTP secret string (must be valid base32).
 */
export function isValidTOTPSecret(secret: string): boolean {
  try {
    base32Decode(secret.replace(/\s/g, '').toUpperCase())
    return true
  } catch {
    return false
  }
}

/**
 * Parse an otpauth:// URI (from QR code scan / manual entry).
 */
export function parseOtpAuthUri(uri: string): { secret: string; issuer: string; account: string } | null {
  try {
    const url = new URL(uri)
    if (url.protocol !== 'otpauth:') return null
    const secret = url.searchParams.get('secret') || ''
    const issuer = url.searchParams.get('issuer') || ''
    const label = decodeURIComponent(url.pathname.replace(/^\/\/totp\//, ''))
    const account = label.includes(':') ? label.split(':')[1] : label
    return { secret, issuer, account }
  } catch {
    return null
  }
}
