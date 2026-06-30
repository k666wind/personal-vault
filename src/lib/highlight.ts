// S6-F: Text highlight helper — wraps matched substring in <mark> tags
// Safe: only modifies text nodes, no dangerouslySetInnerHTML needed for the helper itself

export function highlightText(text: string, query: string): string {
  if (!query.trim() || !text) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped.replace(
    new RegExp(`(${escapedQuery})`, 'gi'),
    '<mark class="search-highlight">$1</mark>'
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
