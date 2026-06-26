// Shared HTML sanitisation utility (BUG-24 fix extracted to shared module).
// Uses the browser's DOMParser — no external dependencies needed.
// Removes: script/style/iframe/object/embed/form tags, on* event attributes,
// javascript: href/src values.

export function sanitizeHtml(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const dangerous = doc.querySelectorAll('script, style, iframe, object, embed, form')
  dangerous.forEach((el) => el.remove())

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT)
  let node: Node | null = walker.currentNode
  while (node) {
    const el = node as Element
    for (const attr of Array.from(el.attributes)) {
      if (
        attr.name.startsWith('on') ||
        (attr.name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:')) ||
        (attr.name === 'src' && attr.value.trim().toLowerCase().startsWith('javascript:'))
      ) {
        el.removeAttribute(attr.name)
      }
    }
    node = walker.nextNode()
  }

  return doc.body.innerHTML
}
