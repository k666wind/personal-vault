import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Loader2, XCircle, Link, Bold, Italic, Code, List, Heading2, Quote, Minus, ExternalLink } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useNoteStore } from '../stores/noteStore'
import TagInput from './TagInput'
import OcrButton from './OcrButton'
import { extractWikiLinks, renderWikiLinks } from '../lib/wikilinks'
import type { Note } from '../types'

interface Props {
  note?: Note
  onClose: () => void
  allTags: string[]
  onSearchNote?: (title: string) => void
}

function sanitizeHtml(html: string): string {
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

// S6-A: Markdown toolbar button definitions
interface ToolbarAction {
  icon: React.ReactNode
  label: string
  prefix: string
  suffix?: string
  block?: boolean       // insert on its own line
  listPrefix?: string   // for list items
}

export default function NoteModal({ note, onClose, allTags, onSearchNote }: Props) {
  const { t, user, settings } = useAppStore()
  const { add, update, notes } = useNoteStore()

  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tags, setTags] = useState<string[]>(note?.tags || [])
  const [reminderAt, setReminderAt] = useState<string>(
    note?.reminderAt ? new Date(note.reminderAt).toISOString().slice(0, 16) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [markdownPreview, setMarkdownPreview] = useState(false)
  const [renderedMd, setRenderedMd] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isEdit = !!note
  const lang = settings.language

  const notesByTitle = new Map(notes.map((n) => [n.title, n.id]))
  const wikiLinks = extractWikiLinks(content)

  const handleOcr = (text: string) => {
    setContent((prev) => prev ? `${prev}\n\n${text}` : text)
  }

  const handlePreviewToggle = async () => {
    if (!markdownPreview) {
      try {
        const { marked } = await import('marked')
        const raw = await marked.parse(content)
        const sanitized = sanitizeHtml(raw)
        setRenderedMd(renderWikiLinks(sanitized, () => {}, notesByTitle))
      } catch {
        setRenderedMd(`<pre>${content.replace(/</g, '&lt;')}</pre>`)
      }
    }
    setMarkdownPreview(!markdownPreview)
  }

  useEffect(() => {
    const div = previewRef.current
    if (!div) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const wl = target.closest('[data-wikilink]')
      if (wl) {
        const linkTitle = wl.getAttribute('data-wikilink') || ''
        onSearchNote?.(linkTitle)
        onClose()
      }
    }
    div.addEventListener('click', handler)
    return () => div.removeEventListener('click', handler)
  }, [markdownPreview, onSearchNote, onClose])

  // S6-A: Insert markdown syntax at cursor position
  const insertMarkdown = useCallback((action: ToolbarAction) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end)
    const prefix = action.prefix
    const suffix = action.suffix ?? action.prefix

    let newText: string
    let newStart: number
    let newEnd: number

    if (action.block) {
      // Block-level: insert on a new line
      const before = content.slice(0, start)
      const after = content.slice(end)
      const needsLeadingNewline = before.length > 0 && !before.endsWith('\n')
      const leadingNl = needsLeadingNewline ? '\n' : ''
      const inserted = `${leadingNl}${prefix}${selected}`
      newText = before + inserted + after
      newStart = newEnd = start + inserted.length
    } else {
      // Inline: wrap selection (or insert placeholder)
      const placeholder = selected || (lang === 'zh' ? '文字' : 'text')
      const inserted = `${prefix}${placeholder}${suffix}`
      newText = content.slice(0, start) + inserted + content.slice(end)
      newStart = start + prefix.length
      newEnd = newStart + (selected || placeholder).length
    }

    setContent(newText)
    // Restore focus + selection after state update
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newStart, newEnd)
    })
  }, [content, lang])

  const toolbarActions: ToolbarAction[] = [
    { icon: <Bold size={14} />,         label: lang === 'zh' ? '粗體' : 'Bold',        prefix: '**', suffix: '**' },
    { icon: <Italic size={14} />,       label: lang === 'zh' ? '斜體' : 'Italic',      prefix: '_',  suffix: '_' },
    { icon: <Code size={14} />,         label: lang === 'zh' ? '代碼' : 'Code',        prefix: '`',  suffix: '`' },
    { icon: <Heading2 size={14} />,     label: lang === 'zh' ? '標題' : 'Heading',     prefix: '## ', block: true },
    { icon: <List size={14} />,         label: lang === 'zh' ? '清單' : 'List',        prefix: '- ',  block: true },
    { icon: <Quote size={14} />,        label: lang === 'zh' ? '引用' : 'Quote',       prefix: '> ',  block: true },
    { icon: <Minus size={14} />,        label: lang === 'zh' ? '分隔線' : 'Divider',  prefix: '\n---\n', block: true },
    { icon: <ExternalLink size={14} />, label: lang === 'zh' ? '連結' : 'Link',        prefix: '[', suffix: '](url)' },
  ]

  const handleSave = async () => {
    if (!title.trim()) { setError(t('note', 'titleRequired')); return }
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        content,
        tags,
        isFavourite: note?.isFavourite || false,
        isPinned: note?.isPinned || false,
        reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined,
      }
      if (isEdit) {
        await update(note.id, data)
      } else {
        await add(user!.uid, data)
      }
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('permission') || msg.includes('Missing or insufficient')) {
        setError(t('error', 'permissionError'))
      } else if (msg.includes('network') || msg.includes('unavailable')) {
        setError(t('error', 'networkError'))
      } else {
        setError(t('error', 'saveFailed') + (msg || t('error', 'unknownError')))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-tall">
        <div className="modal-header">
          <h2>{isEdit ? t('common', 'edit') : t('note', 'add')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Title */}
          <div className="field">
            <label className="field-label">{t('common', 'title')}</label>
            <input
              type="text"
              className="input"
              placeholder={t('note', 'titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!isEdit}
            />
          </div>

          {/* Content + toolbar */}
          <div className="field">
            <div className="field-label-row">
              <label className="field-label">{t('note', 'content')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-add-row" onClick={handlePreviewToggle} style={{ fontSize: 11 }}>
                  {markdownPreview ? '\u270F\uFE0F ' + t('common', 'edit') : '\uD83D\uDC41 MD'}
                </button>
                <OcrButton onExtracted={handleOcr} label={t('note', 'extractFromImage')} />
              </div>
            </div>

            {/* S6-A: Markdown toolbar — only shown in edit mode */}
            {!markdownPreview && (
              <div className="md-toolbar">
                {toolbarActions.map((action, i) => (
                  <button
                    key={i}
                    className="md-toolbar-btn"
                    title={action.label}
                    onMouseDown={(e) => {
                      // Prevent textarea from losing focus before we read selectionStart
                      e.preventDefault()
                      insertMarkdown(action)
                    }}
                  >
                    {action.icon}
                  </button>
                ))}
              </div>
            )}

            {markdownPreview ? (
              <div
                ref={previewRef}
                className="markdown-preview input"
                style={{ minHeight: 180, overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: renderedMd }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                className="input note-textarea"
                placeholder={t('note', 'contentPlaceholder')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
              />
            )}
          </div>


          {/* S6-G: Word count + reading time */}
          {!markdownPreview && content && (
            <div style={{ display: 'flex', gap: 12, marginTop: -8, marginBottom: 4, fontSize: 11, color: 'var(--color-text-3)' }}>
              {(() => {
                const words = content.trim().split(/\s+/).filter(Boolean).length
                const chars = content.length
                const paragraphs = content.split(/\n\n+/).filter(s => s.trim()).length
                const readMins = Math.max(1, Math.round(words / 200))
                return (
                  <>
                    <span>{lang === 'zh' ? `${chars} 字` : `${chars} chars`}</span>
                    <span>{lang === 'zh' ? `${words} 詞` : `${words} words`}</span>
                    <span>{lang === 'zh' ? `${paragraphs} 段` : `${paragraphs} para`}</span>
                    <span>{lang === 'zh' ? `約 ${readMins} 分鐘閱讀` : `~${readMins} min read`}</span>
                  </>
                )
              })()}
            </div>
          )}

          {/* WikiLinks hint */}
          {wikiLinks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: -8, marginBottom: 4 }}>
              <Link size={12} style={{ color: 'var(--color-text-3)', marginTop: 2 }} />
              {wikiLinks.map((wl, i) => {
                const exists = notesByTitle.has(wl)
                return (
                  <span key={i} style={{
                    fontSize: 11, padding: '2px 7px',
                    borderRadius: 12,
                    background: exists ? 'var(--color-primary-light)' : 'var(--color-surface-2)',
                    color: exists ? 'var(--color-primary)' : 'var(--color-text-3)',
                  }}>
                    {wl}
                  </span>
                )
              })}
            </div>
          )}

          {/* Tags */}
          <div className="field">
            <label className="field-label">{t('common', 'tags')}</label>
            <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
          </div>

          {/* Reminder */}
          <div className="field">
            <div className="field-label-row">
              <label className="field-label">
                {t('common', 'reminder')}
                <span className="optional-hint"> {t('common', 'optional')}</span>
              </label>
              {reminderAt && (
                <button className="icon-btn" title={t('common', 'clearReminder')} onClick={() => setReminderAt('')}>
                  <XCircle size={15} style={{ color: 'var(--color-text-3)' }} />
                </button>
              )}
            </div>
            <input
              type="datetime-local"
              className="input"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>{t('common', 'cancel')}</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : t('common', 'save')}
          </button>
        </div>
      </div>
    </div>
  )
}
