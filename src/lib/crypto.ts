import CryptoJS from 'crypto-js'

// Encrypt plaintext with master password using AES-256
export function encrypt(plaintext: string, masterPassword: string): string {
  return CryptoJS.AES.encrypt(plaintext, masterPassword).toString()
}

// Decrypt ciphertext with master password
export function decrypt(ciphertext: string, masterPassword: string): string | null {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, masterPassword)
    const result = bytes.toString(CryptoJS.enc.Utf8)
    return result || null
  } catch {
    return null
  }
}

// Store a verification token to check master password correctness
const VERIFY_PLAINTEXT = 'vault-verify-ok'
const VERIFY_KEY = 'vault-master-verify'

export function saveMasterVerifier(masterPassword: string): void {
  const token = encrypt(VERIFY_PLAINTEXT, masterPassword)
  localStorage.setItem(VERIFY_KEY, token)
}

export function verifyMasterPassword(masterPassword: string): boolean {
  const token = localStorage.getItem(VERIFY_KEY)
  if (!token) return true // first time — accept anything
  const result = decrypt(token, masterPassword)
  return result === VERIFY_PLAINTEXT
}

export function hasMasterPasswordSet(): boolean {
  return !!localStorage.getItem(VERIFY_KEY)
}
export function clearMasterVerifier(): void {
  localStorage.removeItem(VERIFY_KEY)
}

// Password strength scorer (0–4)
export function scorePassword(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 14) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4
}

// Random password generator
export function generatePassword(length = 16, opts = { upper: true, numbers: true, symbols: true }): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const numbers = '23456789'
  const symbols = '!@#$%^&*-_=+'

  let charset = lower
  if (opts.upper) charset += upper
  if (opts.numbers) charset += numbers
  if (opts.symbols) charset += symbols

  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array).map((x) => charset[x % charset.length]).join('')
}
