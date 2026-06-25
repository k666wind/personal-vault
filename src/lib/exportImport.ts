import type { Recipe, Bookmark, Note, PasswordEntry, DateCountdown } from '../types'

export interface VaultExport {
  version: 2
  exportedAt: number
  recipes: Recipe[]
  bookmarks: Bookmark[]
  notes: Note[]
  passwords: PasswordEntry[] // still encrypted
  countdowns: DateCountdown[] // BUG-13 FIX: was missing from export
}

// BUG-12 FIX: Basic runtime schema validation helper
function isString(v: unknown): v is string { return typeof v === 'string' }
function isNumber(v: unknown): v is number { return typeof v === 'number' }
function isArray(v: unknown): v is unknown[] { return Array.isArray(v) }

// ── JSON Export ───────────────────────────────────────────
export function exportJson(data: VaultExport): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── CSV Export (bookmarks + notes) ────────────────────────
// BUG-33 FIX: escape ALL fields properly (url, tags were previously unescaped)
function csvEscape(value: string): string {
  // Wrap in quotes and escape internal double-quotes by doubling them
  return `"${value.replace(/"/g, '""')}"`
}

export function exportCsv(bookmarks: Bookmark[], notes: Note[]): void {
  const rows: string[] = ['Type,Title,Content/URL,Tags,Created']

  bookmarks.forEach((b) => {
    rows.push([
      'bookmark',
      csvEscape(b.title),
      csvEscape(b.url),
      csvEscape(b.tags.join(', ')),
      new Date(b.createdAt).toLocaleDateString(),
    ].join(','))
  })

  notes.forEach((n) => {
    rows.push([
      'note',
      csvEscape(n.title),
      csvEscape(n.content.slice(0, 200).replace(/\n/g, ' ')),
      csvEscape(n.tags.join(', ')),
      new Date(n.createdAt).toLocaleDateString(),
    ].join(','))
  })

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── JSON Import ───────────────────────────────────────────
export async function importJson(file: File): Promise<VaultExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        // BUG-12 FIX: runtime schema validation — reject obviously malformed files
        if (!isNumber(data.version) || !isNumber(data.exportedAt)) {
          reject(new Error('無效嘅 Vault 匯入檔案（缺少 version 或 exportedAt）'))
          return
        }
        if (!isArray(data.bookmarks) && data.bookmarks !== undefined) {
          reject(new Error('無效嘅 bookmarks 欄位')); return
        }
        if (!isArray(data.notes) && data.notes !== undefined) {
          reject(new Error('無效嘅 notes 欄位')); return
        }
        if (!isArray(data.recipes) && data.recipes !== undefined) {
          reject(new Error('無效嘅 recipes 欄位')); return
        }
        if (!isArray(data.passwords) && data.passwords !== undefined) {
          reject(new Error('無效嘅 passwords 欄位')); return
        }
        if (!isArray(data.countdowns) && data.countdowns !== undefined) {
          reject(new Error('無效嘅 countdowns 欄位')); return
        }

        // Validate a sample bookmark entry if present
        const bm = (data.bookmarks || [])[0]
        if (bm && (!isString(bm.url) || !isString(bm.title))) {
          reject(new Error('Bookmark 格式錯誤（缺少 url 或 title）')); return
        }

        // Validate a sample note entry if present
        const nt = (data.notes || [])[0]
        if (nt && (!isString(nt.title) || !isString(nt.content))) {
          reject(new Error('Note 格式錯誤（缺少 title 或 content）')); return
        }

        resolve(data as VaultExport)
      } catch {
        reject(new Error('JSON 格式錯誤'))
      }
    }
    reader.onerror = () => reject(new Error('讀取檔案失敗'))
    reader.readAsText(file)
  })
}
