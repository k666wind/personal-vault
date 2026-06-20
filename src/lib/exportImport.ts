import type { Recipe, Bookmark, Note, PasswordEntry } from '../types'

export interface VaultExport {
  version: 1
  exportedAt: number
  recipes: Recipe[]
  bookmarks: Bookmark[]
  notes: Note[]
  passwords: PasswordEntry[] // still encrypted
}

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
export function exportCsv(bookmarks: Bookmark[], notes: Note[]): void {
  const rows: string[] = ['Type,Title,Content/URL,Tags,Created']

  bookmarks.forEach((b) => {
    rows.push([
      'bookmark',
      `"${b.title.replace(/"/g, '""')}"`,
      `"${b.url}"`,
      `"${b.tags.join(', ')}"`,
      new Date(b.createdAt).toLocaleDateString(),
    ].join(','))
  })

  notes.forEach((n) => {
    rows.push([
      'note',
      `"${n.title.replace(/"/g, '""')}"`,
      `"${n.content.slice(0, 200).replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${n.tags.join(', ')}"`,
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
        if (!data.version || !data.exportedAt) {
          reject(new Error('無效嘅 Vault 匯入檔案'))
          return
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
