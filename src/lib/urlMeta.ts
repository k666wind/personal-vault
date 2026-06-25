export interface UrlMeta {
  title: string
  description: string
  favicon: string
}

// BUG-32 FIX: Normalise any favicon href to an absolute URL.
// Previous implementation failed for:
//   • protocol-relative URLs: //cdn.example.com/icon.png → wrongly prepended origin
//   • relative paths: ../images/icon.png → produced invalid URL
//   • data URIs: correctly handled now (returned as-is)
function resolveIconUrl(href: string, origin: string, pageUrl: string): string {
  // data URIs — return as-is
  if (href.startsWith('data:')) return href

  try {
    // Use the URL constructor: it resolves relative, absolute, and protocol-relative URLs
    // Protocol-relative "//cdn.example.com/icon.png" → URL("//cdn.example.com/icon.png", "https://example.com") → "https://cdn.example.com/icon.png"
    // Relative "../img/icon.png" → resolved against pageUrl base
    return new URL(href, pageUrl).href
  } catch {
    // Fallback: treat as root-relative
    return `${origin}${href.startsWith('/') ? '' : '/'}${href}`
  }
}

// Uses allorigins.win as a free CORS proxy to fetch page metadata
// BUG-19 awareness: no SLA on allorigins.win; timeout guard added (8s)
export async function fetchUrlMeta(url: string): Promise<UrlMeta> {
  const defaultMeta: UrlMeta = { title: '', description: '', favicon: '' }

  try {
    const parsedUrl = new URL(url)
    const origin = parsedUrl.origin
    // Default favicon: try /favicon.ico
    defaultMeta.favicon = `${origin}/favicon.ico`

    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return defaultMeta

    const json = await res.json()
    const html: string = json.contents || ''

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Title
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    const title = ogTitle || doc.querySelector('title')?.textContent || ''

    // Description
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')
    const description = ogDesc || metaDesc || ''

    // Favicon — try multiple selectors in priority order
    const iconHref =
      doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href') ||
      doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
      doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
      '/favicon.ico'

    // BUG-32 FIX: resolve against the actual page URL so relative and
    // protocol-relative hrefs are handled correctly
    const favicon = resolveIconUrl(iconHref, origin, url)

    return {
      title: title.trim(),
      description: description.trim(),
      favicon,
    }
  } catch {
    return defaultMeta
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function normaliseUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`
  }
  return trimmed
}
