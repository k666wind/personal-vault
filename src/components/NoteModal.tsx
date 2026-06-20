import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
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

  const isEdit = !!note

  const handleOcr = (text: string) => {
    setContent((prev) => prev ? `${prev}\n\n${text}` : text)
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('請輸入標題'); return }
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
      const msg = e instanceof Error ? (e as Error).message : ''
      if (msg.includes('permission') || msg.includes('Missing or insufficient')) {
        setError('權限錯誤：請確認 Firestore Rules 已設定正確')
      } else if (msg.includes('network') || msg.includes('unavailable')) {
        setError('網絡錯誤：請檢查網絡連接')
      } else {
        setError('儲存失敗：' + (msg || '未知錯誤'))
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
            <label className="field-label">標題</label>
            <input
              type="text"
              className="input"
              placeholder="筆記標題"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!isEdit}
            />
          </div>

          {/* Content + OCR */}
          <div className="field">
            <div className="field-label-row">
              <label className="field-label">{t('note', 'content')}</label>
              <OcrButton onExtracted={handleOcr} label={t('note', 'extractFromImage')} />
            </div>
            <textarea
              className="input note-textarea"
              placeholder="輸入筆記內容，或用相機圖示從圖片提取文字..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />
          </div>

          {/* Tags */}
          <div className="field">
            <label className="field-label">{t('common', 'tags')}</label>
            <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
          </div>

          {/* Reminder */}
          <div className="field">
            <label className="field-label">{t('note', 'reminder')}</label>
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
