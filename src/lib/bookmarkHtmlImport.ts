// S6-B: Browser Bookmark HTML Importer
// Parses the Netscape Bookmark File Format exported by Chrome, Firefox, Safari, Edge
// Returns a flat list of bookmarks with title, url, optional folder path as tags

export interface ImportedBookmark {
  url: string
  title: string
  tags: string[]           // folder path segments become tags
  addDate?: number         // Unix timestamp from ADD_DATE attribute
}

export interface ImportResult {
  bookmarks: ImportedBookmark[]
  errors: string[]
}

function cleanTag(folder: string): string {
  return folder.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '')
}

function parseFolder(
  element: Element,
  folderPath: string[],
  results: ImportedBookmark[],
  errors: string[]
) {
  const children = element.children
  for (const child of Array.from(children)) {
    const tag = child.tagName.toUpperCase()
    if (tag === 'DT') {
      const inner = child.children[0]
      if (!inner) continue
      const innerTag = inner.tagName.toUpperCase()
      if (innerTag === 'A') {
        // Leaf bookmark
        const url = inner.getAttribute('HREF') || ''
        const title = inner.textContent?.trim() || url
        const addDateAttr = inner.getAttribute('ADD_DATE')
        const addDate = addDateAttr ? parseInt(addDateAttr, 10) * 1000 : undefined

        if (!url || url === 'place:' || url.startsWith('javascript:')) continue
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ftp://')) {
          errors.push(`Skipped non-HTTP URL: ${url}`)
          continue
        }
        const tags = folderPath.map(cleanTag).filter(Boolean)
        results.push({ url, title, tags, addDate })
      } else if (innerTag === 'H3') {
        // Folder — recurse into the following DL
        const folderName = inner.textContent?.trim() || 'folder'
        const dl = child.querySelector('DL')
        if (dl) {
          parseFolder(dl, [...folderPath, folderName], results, errors)
        }
      }
    } else if (tag === 'DL') {
      parseFolder(child, folderPath, results, errors)
    }
  }
}

export function parseBookmarkHtml(html: string): ImportResult {
  const results: ImportedBookmark[] = []
  const errors: string[] = []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Find the root DL — Chrome/Firefox both put everything inside the first DL
    const rootDl = doc.querySelector('DL')
    if (!rootDl) {
      errors.push('No bookmark list (DL) found in file. Is this a valid browser bookmarks export?')
      return { bookmarks: [], errors }
    }

    parseFolder(rootDl, [], results, errors)
  } catch (e) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  const deduped = results.filter(b => {
    if (seen.has(b.url)) return false
    seen.add(b.url)
    return true
  })

  return { bookmarks: deduped, errors }
}
