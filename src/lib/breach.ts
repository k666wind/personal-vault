// F-02: HaveIBeenPwned breach detection using k-anonymity.
// Only the first 5 characters of the SHA-1 hash are sent to the API.
// The full hash never leaves the device, so this is safe to use on real passwords.

/**
 * Check if a plaintext password has appeared in known data breaches.
 * Returns the number of times it was found (0 = not breached).
 * Returns null if the check fails (network error, API down, etc.).
 */
export async function checkPasswordBreach(plainPassword: string): Promise<number | null> {
  try {
    // SHA-1 hash of the password
    const encoded = new TextEncoder().encode(plainPassword)
    const hashBuffer = await crypto.subtle.digest('SHA-1', encoded)
    const hex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()

    const prefix = hex.slice(0, 5)
    const suffix = hex.slice(5)

    // k-anonymity: only send the first 5 chars of the hash
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const text = await res.text()
    // Response is "HASH_SUFFIX:COUNT\n..." lines
    const lines = text.split('\n')
    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(':')
      if (hashSuffix === suffix) {
        return parseInt(countStr, 10)
      }
    }
    return 0 // Not found in breach database
  } catch {
    return null // Network failure — don't block UX
  }
}

/**
 * Check multiple passwords in parallel (max 5 concurrent to be polite to the API).
 * Returns a Map<id, breachCount | null>.
 */
export async function checkMultipleBreaches(
  entries: Array<{ id: string; plain: string }>
): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>()
  const CONCURRENCY = 5

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY)
    const checks = await Promise.all(
      batch.map(async (e) => ({ id: e.id, count: await checkPasswordBreach(e.plain) }))
    )
    checks.forEach(({ id, count }) => results.set(id, count))
    // Small delay between batches to avoid rate-limiting
    if (i + CONCURRENCY < entries.length) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  return results
}
