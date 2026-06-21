import { useState } from 'react'
import { X, Loader2, XCircle } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useNoteStore } from '../stores/noteStore'
import TagInput from './TagInput'
import OcrButton from './OcrButton'
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
      // Lazy-load marked
      try {
        const { marked } = await import('marked')
        setRenderedMd(await marked.parse(content))
      } catch {
        setRenderedMd(`<pre>${content}</pre>`)
      }
    }
    setMarkdownPreview(!markdownPreview)
  }

  const handleSave = async () => {
    if (!title.trim()) { setError(t('note', 'titleRequired')); return }
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        content,
        tags,
        isFavourite: note?.isFavourite || false,
        ...(reminderAt ? { reminderAt: new Date(reminderAt).getTime() } : {}),
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
