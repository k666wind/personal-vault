// F-11: WikiLinks support for notes.
// Syntax: [[Note Title]] links to another note by title (case-insensitive).
// Used in two places:
//   1. NoteModal markdown renderer — renders as clickable <a> tags
//   2. NoteCard preview — shows [[...]] references with highlight

/**
 * Pre-process raw markdown text: convert [[Title]] → a custom HTML tag
 * that the marked renderer will turn into a clickable link.
 * We use a placeholder element to avoid collisions with real markdown.
 */
export function preprocessWikiLinks(markdown: string): string {
  // Replace [[Title]] with <wikilink title="Title">Title</wikilink>
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (_, title: string) => {
    const escaped = title.replace(/"/g, '&quot;')
    return `<wikilink data-title="${escaped}">${escaped}</wikilink>`
  })
}

/**
 * Post-process sanitised HTML: replace <wikilink> tags with styled <a> tags.
 * Called after DOMPurify-equivalent sanitisation (our DOMParser approach).
 * Returns HTML string with wikilinks rendered as clickable spans.
 */
export function renderWikiLinks(html: string, onNavigate: (title: string) => void): string {
  // We can't attach event listeners in a string, so we use data attributes
  // and attach a delegated listener on the preview container instead.
  return html.replace(
    /<wikilink data-title="([^"]*)">[^<]*<\/wikilink>/g,
    (_, title: string) =>
      `<a class="wikilink" data-wikilink="${title}" href="#" onclick="return false;">${title}</a>`
  )
}

/**
 * Extract all [[Title]] references from a markdown string.
 */
export function extractWikiLinks(markdown: string): string[] {
  const matches = [...markdown.matchAll(/\[\[([^\]]+)\]\]/g)]
  return matches.map((m) => m[1])
}

/**
 * Replace [[Title]] with plain text (for search indexing / plain-text display).
 */
export function stripWikiLinks(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, '$1')
}
