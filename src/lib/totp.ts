// F-01: TOTP / 2FA code generation
// Pure browser implementation using Web Crypto API (SubtleCrypto + HMAC-SHA1).
// Replaces @otplib/preset-browser which pulls in Node.js `buffer` and crashes
// in the browser at runtime (ReferenceError: buffer is not defined).

/** Decode a base32 string to a Uint8Array */
function base32Decode(input: string): Uint8Array {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = input.replace(/\s|=/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const output: number[] = []
  for (const char of clean) {
    const idx = ALPHABET.indexOf(char)
    if (idx < 0) throw new Error(`Invalid base32 char: ${char}`)
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(output)
}

/** HMAC-SHA1 via Web Crypto */
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key.buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data.buffer as ArrayBuffer)
  return new Uint8Array(sig)
}

/** Encode a 64-bit counter as big-endian 8 bytes */
function counterToBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8)
  let c = Math.floor(counter)
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff
    c = Math.floor(c / 256)
  }
  return buf
}

const STEP = 30
const DIGITS = 6

/**
 * Generate the current 6-digit TOTP code from a base32 secret.
 * Returns null if the secret is invalid.
 * NOTE: async because SubtleCrypto is promise-based.
 */
export async function generateTOTPAsync(secret: string): Promise<string | null> {
  try {
    const key = base32Decode(secret.replace(/\s/g, '').toUpperCase())
    const counter = Math.floor(Date.now() / 1000 / STEP)
    const mac = await hmacSha1(key, counterToBytes(counter))
    const offset = mac[mac.length - 1] & 0x0f
    const code =
      ((mac[offset] & 0x7f) << 24) |
      ((mac[offset + 1] & 0xff) << 16) |
      ((mac[offset + 2] & 0xff) << 8) |
      (mac[offset + 3] & 0xff)
    return String(code % Math.pow(10, DIGITS)).padStart(DIGITS, '0')
  } catch {
    return null
  }
}

/** Seconds remaining in the current 30-second TOTP window. */
export function totpSecondsRemaining(): number {
  return STEP - (Math.floor(Date.now() / 1000) % STEP)
}

/** Validate a TOTP secret (synchronous — just checks base32 decode) */
export function isValidTOTPSecret(secret: string): boolean {
  try {
    base32Decode(secret.replace(/\s/g, '').toUpperCase())
    return true
  } catch {
    return false
  }
}

/** Parse an otpauth:// URI. Returns null if invalid. */
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

// ---------------------------------------------------------------------------
// Legacy sync shim — callers that used generateTOTP() synchronously will get
// a placeholder until they migrate to generateTOTPAsync().
// TOTPDisplay.tsx is the main caller and has been updated to use the async version.
// ---------------------------------------------------------------------------
/** @deprecated Use generateTOTPAsync() instead */
export function generateTOTP(_secret: string): string | null {
  // Cannot be sync with SubtleCrypto. Return null; callers must use async version.
  return null
}
