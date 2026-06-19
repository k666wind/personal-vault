export interface UrlMeta {
  title: string
  description: string
  favicon: string
}

// Uses allorigins.win as a free CORS proxy to fetch page metadata
export async function fetchUrlMeta(url: string): Promise<UrlMeta> {
  const defaultMeta: UrlMeta = { title: '', description: '', favicon: '' }

  try {
    const origin = new URL(url).origin
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

    // Favicon
    const iconLink =
      doc.querySelector('link[rel="icon"]')?.getAttribute('href') ||
      doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') ||
      '/favicon.ico'

    const favicon = iconLink.startsWith('http')
      ? iconLink
      : `${origin}${iconLink.startsWith('/') ? '' : '/'}${iconLink}`

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
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`
  }
  return url
}
