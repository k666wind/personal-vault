import { useState } from 'react'
import { X, Loader2, XCircle } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useNoteStore } from '../stores/noteStore'
import TagInput from './TagInput'
import OcrButton from './OcrButton'
import { sanitizeHtml } from '../lib/sanitize'
import { preprocessWikiLinks, renderWikiLinks, extractWikiLinks } from '../lib/wikilinks'
import type { Note } from '../types'

interface Props {
  note?: Note
  onClose: () => void
  allTags: string[]
}


export default function NoteModal({ note, onClose, allTags }: Props) {
  const { t, user } = useAppStore()
  const { add, update } = useNoteStore()

  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tags, setTags] = useState<string[]>(note?.tags || [])
  // BUG-25 FIX: Use null sentinel to distinguish "no reminder" vs "unchanged".
  // Empty string means user cleared the field; we must send null to Firestore.
  const [reminderAt, setReminderAt] = useState<string>(
    note?.reminderAt ? new Date(note.reminderAt).toISOString().slice(0, 16) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [markdownPreview, setMarkdownPreview] = useState(false)
  const [renderedMd, setRenderedMd] = useState('')

  const isEdit = !!note

  const handleOcr = (text: string) => {
    setContent((prev) => prev ? `${prev}\n\n${text}` : text)
  }

  const handlePreviewToggle = async () => {
    if (!markdownPreview) {
      try {
        const { marked } = await import('marked')
        // F-11: pre-process WikiLinks [[Title]] before marked parses
        const withWiki = preprocessWikiLinks(content)
        const raw = await marked.parse(withWiki)
        // BUG-24 FIX: sanitise, then render WikiLinks as clickable anchors
        const sanitized = sanitizeHtml(raw)
        setRenderedMd(renderWikiLinks(sanitized))
      } catch {
        setRenderedMd(`<pre>${content.replace(/</g, '&lt;')}</pre>`)
      }
    }
    setMarkdownPreview(!markdownPreview)
  }

  const handleSave = async () => {
    if (!title.trim()) { setError(t('note', 'titleRequired')); return }
    setSaving(true)
    try {
      // BUG-25 FIX: always include reminderAt in the update payload.
      // When the user clears the field (reminderAt === ''), we must explicitly
      // send null so Firestore's updateDoc removes the old value. Previously,
      // omitting the key meant the old reminderAt persisted forever.
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
                <button
                  className="btn-add-row"
                  onClick={handlePreviewToggle}
                  style={{ fontSize: 11 }}
                >
                  {markdownPreview ? '✏️ ' + t('common', 'edit') : '👁 MD'}
                </button>
                <OcrButton onExtracted={handleOcr} label={t('note', 'extractFromImage')} />
              </div>
            </div>
            {markdownPreview ? (
              <div
                className="markdown-preview input"
                style={{ minHeight: 180, overflowY: 'auto' }}
                dangerouslySetInnerHTML={{ __html: renderedMd }}
                onClick={(e) => {
                  // F-11: handle WikiLink clicks via event delegation
                  const target = e.target as HTMLElement
                  const link = target.closest('[data-wikilink]') as HTMLElement | null
                  if (link) {
                    e.preventDefault()
                    const title = link.getAttribute('data-wikilink') || ''
                    // TODO F-11: navigate to linked note by title
                    console.info('[WikiLink] clicked:', title)
                  }
                }}
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

          {/* F-11: WikiLinks hint — show [[links]] extracted from content */}
          {(() => {
            const links = extractWikiLinks(content)
            if (links.length === 0) return null
            return (
              <div style={{ fontSize: 11, color: 'var(--color-text-3)', padding: '4px 0' }}>
                🔗 WikiLinks: {links.map((l) => (
                  <span key={l} className="tag-chip" style={{ marginRight: 4, fontSize: 10 }}>[[{l}]]</span>
                ))}
              </div>
            )
          })()}

          {/* Tags */}
          <div className="field">
            <label className="field-label">{t('common', 'tags')}</label>
            <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
          </div>

          {/* Reminder — OPTIONAL */}
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

          {/* BUG-30 FIX: clarify that reminders are display-only (no push notification) */}
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: -8 }}>
            ⚠️ 提醒只會在 App 開啟時顯示，不會發送系統通知
          </p>

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
