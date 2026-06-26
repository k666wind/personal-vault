// F-01: TOTP / 2FA code generation
// Uses @otplib/preset-browser which is already installed in package.json.
// Wraps the library with vault-specific helpers.
import { authenticator } from '@otplib/preset-browser'

// Configure TOTP to standard 30-second window, 6 digits
authenticator.options = { digits: 6, step: 30 }

/**
 * Generate the current 6-digit TOTP code from a base32 secret.
 * Returns null if the secret is invalid.
 */
export function generateTOTP(secret: string): string | null {
  try {
    return authenticator.generate(secret.replace(/\s/g, '').toUpperCase())
  } catch {
    return null
  }
}

/**
 * Seconds remaining in the current 30-second TOTP window.
 */
export function totpSecondsRemaining(): number {
  return authenticator.timeRemaining()
}

/**
 * Validate a TOTP secret string (must be valid base32).
 */
export function isValidTOTPSecret(secret: string): boolean {
  try {
    authenticator.generate(secret.replace(/\s/g, '').toUpperCase())
    return true
  } catch {
    return false
  }
}

/**
 * Parse an otpauth:// URI (from QR code scan / manual entry).
 * Returns the extracted secret, issuer, and account name.
 */
export function parseOtpAuthUri(uri: string): { secret: string; issuer: string; account: string } | null {
  try {
    const url = new URL(uri)
    if (url.protocol !== 'otpauth:') return null
    const secret = url.searchParams.get('secret') || ''
    const issuer = url.searchParams.get('issuer') || ''
    // label = "issuer:account" or just "account"
    const label = decodeURIComponent(url.pathname.replace(/^\/\/totp\//, ''))
    const account = label.includes(':') ? label.split(':')[1] : label
    return { secret, issuer, account }
  } catch {
    return null
  }
}
