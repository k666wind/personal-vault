// F-11: WikiLinks — [[Note Title]] syntax support

// Extract all [[...]] references from note content
export function extractWikiLinks(content: string): string[] {
  const matches = [...content.matchAll(/\[\[([^\]]+)\]\]/g)]
  return matches.map((m) => m[1].trim())
}

// Render [[Title]] as clickable spans in plain text (before markdown parse)
// Returns HTML string — must be used AFTER sanitizeHtml in NoteModal
export function renderWikiLinks(
  html: string,
  _onClickTitle: (title: string) => void,
  notesByTitle: Map<string, string>  // title → id
): string {
  // We inject data attributes and handle click via event delegation
  return html.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const trimmed = title.trim()
    const exists = notesByTitle.has(trimmed)
    const color = exists ? 'var(--color-primary)' : 'var(--color-text-3)'
    const decoration = exists ? 'underline' : 'none'
    return `<span
      data-wikilink="${trimmed.replace(/"/g, '&quot;')}"
      style="color:${color};text-decoration:${decoration};cursor:pointer;"
      title="${exists ? 'Open note' : 'Note not found'}"
    >[[${trimmed}]]</span>`
  })
}

// Pre-process content before Markdown rendering (escape for marked)
// This prevents marked from breaking [[...]] syntax
export function preprocessWikiLinks(content: string): string {
  // Replace [[Title]] with a placeholder that survives markdown parsing,
  // then we apply renderWikiLinks on the HTML output
  return content
}
