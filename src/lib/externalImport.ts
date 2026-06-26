// F-08: Import passwords from external password managers.
// Supports: Chrome CSV, 1Password CSV, Bitwarden JSON.

export interface ImportedPassword {
  site: string
  username: string
  password: string
  notes?: string
  url?: string
}

export type ImportFormat = 'chrome' | '1password' | 'bitwarden' | 'unknown'

/**
 * Detect the format of an uploaded file from its headers / structure.
 */
export function detectFormat(text: string): ImportFormat {
  const firstLine = text.trim().split('\n')[0].toLowerCase()
  // Chrome: name,url,username,password
  if (firstLine.includes('name') && firstLine.includes('url') && firstLine.includes('username') && firstLine.includes('password') && !firstLine.includes('title')) {
    return 'chrome'
  }
  // 1Password: Title,Username,Password,URL,Notes or similar
  if (firstLine.includes('title') && firstLine.includes('username') && firstLine.includes('password')) {
    return '1password'
  }
  // Bitwarden JSON
  try {
    const json = JSON.parse(text)
    if (json.items && Array.isArray(json.items)) return 'bitwarden'
  } catch { /* not JSON */ }
  return 'unknown'
}

/**
 * Parse a CSV string into rows, handling quoted fields with commas/newlines.
 */
function parseCsvRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCsv(text: string): string[][] {
  // Split on newlines not inside quotes
  const lines: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes
    else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current)
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) lines.push(current)
  return lines.map(parseCsvRow)
}

/**
 * Import from Chrome password export CSV.
 * Headers: name,url,username,password
 */
export function importChrome(text: string): ImportedPassword[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const idx = {
    name: headers.indexOf('name'),
    url: headers.indexOf('url'),
    username: headers.indexOf('username'),
    password: headers.indexOf('password'),
    note: headers.indexOf('note'),
  }
  return rows.slice(1)
    .filter((row) => row[idx.password]?.trim())
    .map((row) => ({
      site: row[idx.name]?.trim() || new URL(row[idx.url] || 'https://unknown').hostname,
      url: row[idx.url]?.trim(),
      username: row[idx.username]?.trim() || '',
      password: row[idx.password]?.trim() || '',
      notes: idx.note >= 0 ? row[idx.note]?.trim() : undefined,
    }))
}

/**
 * Import from 1Password CSV export.
 * Headers: Title,Username,Password,URL,Notes,OTPAuth (optional)
 */
export function import1Password(text: string): ImportedPassword[] {
  const rows = parseCsv(text)
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const idx = {
    title: headers.findIndex((h) => h === 'title'),
    username: headers.findIndex((h) => h === 'username'),
    password: headers.findIndex((h) => h === 'password'),
    url: headers.findIndex((h) => h === 'url' || h === 'website'),
    notes: headers.findIndex((h) => h === 'notes' || h === 'note'),
  }
  return rows.slice(1)
    .filter((row) => row[idx.password]?.trim())
    .map((row) => ({
      site: row[idx.title]?.trim() || 'Unknown',
      url: idx.url >= 0 ? row[idx.url]?.trim() : undefined,
      username: idx.username >= 0 ? row[idx.username]?.trim() || '' : '',
      password: row[idx.password]?.trim() || '',
      notes: idx.notes >= 0 ? row[idx.notes]?.trim() : undefined,
    }))
}

/**
 * Import from Bitwarden JSON export.
 */
export function importBitwarden(text: string): ImportedPassword[] {
  try {
    const data = JSON.parse(text)
    const items = data.items as Array<{
      name?: string
      notes?: string
      login?: { username?: string; password?: string; uris?: Array<{ uri?: string }> }
    }>
    return items
      .filter((item) => item.login?.password)
      .map((item) => ({
        site: item.name?.trim() || 'Unknown',
        url: item.login?.uris?.[0]?.uri?.trim(),
        username: item.login?.username?.trim() || '',
        password: item.login?.password?.trim() || '',
        notes: item.notes?.trim(),
      }))
  } catch {
    return []
  }
}

/**
 * Auto-detect and parse an external password export file.
 * Returns the detected format and parsed entries.
 */
export function parseExternalExport(
  text: string
): { format: ImportFormat; entries: ImportedPassword[] } {
  const format = detectFormat(text)
  let entries: ImportedPassword[] = []
  if (format === 'chrome') entries = importChrome(text)
  else if (format === '1password') entries = import1Password(text)
  else if (format === 'bitwarden') entries = importBitwarden(text)
  return { format, entries }
}
