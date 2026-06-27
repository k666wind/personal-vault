import { useState, useRef, useEffect } from 'react'
import { X, Loader2, XCircle, Link } from 'lucide-react'
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

export default function NoteModal({ note, onClose, allTags, onSearchNote }: Props) {
  const { t, user } = useAppStore()
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

  const isEdit = !!note

  // F-11: Build a map of note title → id for WikiLink resolution
  const notesByTitle = new Map(notes.map((n) => [n.title, n.id]))

  // F-11: WikiLink hints (show linked note titles below textarea)
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
        // F-11: render WikiLinks in the preview HTML
        setRenderedMd(renderWikiLinks(sanitized, () => {}, notesByTitle))
      } catch {
        setRenderedMd(`<pre>${content.replace(/</g, '&lt;')}</pre>`)
      }
    }
    setMarkdownPreview(!markdownPreview)
  }

  // F-11: Handle WikiLink clicks via event delegation on the preview div
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

  const handleSave = async () => {
    if (!title.trim()) { setError(t('note', 'titleRequired')); return }
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        content,
        tags,
        isFavourite: note?.isFavourite || false,
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

          {/* Content + OCR + Markdown toggle */}
          <div className="field">
            <div className="field-label-row">
              <label className="field-label">{t('note', 'content')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-add-row" onClick={handlePreviewToggle} style={{ fontSize: 11 }}>
                  {markdownPreview ? '✏️ ' + t('common', 'edit') : '👁 MD'}
                </button>
                <OcrButton onExtracted={handleOcr} label={t('note', 'extractFromImage')} />
              </div>
            </div>
            {markdownPreview ? (
              <div
                ref={previewRef}
                className="markdown-preview input"
                style={{ minHeight: 180, overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: renderedMd }}
              />
            ) : (
              <textarea
                className="input note-textarea"
                placeholder={t('note', 'contentPlaceholder')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
              />
            )}
          </div>

          {/* F-11: WikiLinks hint */}
          {wikiLinks.length > 0 && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: -8, marginBottom: 4,
            }}>
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
