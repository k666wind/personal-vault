import { useState } from 'react'
import { X, Loader2, XCircle } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useCountdownStore } from '../stores/countdownStore'
import TagInput from './TagInput'
import type { DateCountdown } from '../types'

interface Props {
  item?: DateCountdown
  onClose: () => void
  allTags: string[]
}

function toLocalDateStr(ms: number) {
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function localDateToMs(str: string): number {
  // Parse as local midnight
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

export default function CountdownModal({ item, onClose, allTags }: Props) {
  const { t, user } = useAppStore()
  const { add, update } = useCountdownStore()

  const [title, setTitle] = useState(item?.title || '')
  const [notes, setNotes] = useState(item?.notes || '')
  const [targetDate, setTargetDate] = useState(item?.targetDate ? toLocalDateStr(item.targetDate) : '')
  const [tags, setTags] = useState<string[]>(item?.tags || [])
  const [reminderAt, setReminderAt] = useState<string>(
    item?.reminderAt ? new Date(item.reminderAt).toISOString().slice(0, 16) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!item

  const handleSave = async () => {
    if (!title.trim()) { setError(t('countdown', 'titleRequired')); return }
    if (!targetDate) { setError(t('countdown', 'dateRequired')); return }
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        notes: notes.trim() || undefined,
        targetDate: localDateToMs(targetDate),
        tags,
        isFavourite: item?.isFavourite || false,
        reminderAt: reminderAt ? new Date(reminderAt).getTime() : undefined,
      }
      if (isEdit) {
        await update(item.id, data)
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
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? t('common', 'edit') : t('countdown', 'add')}</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="field-label">{t('common', 'title')}</label>
            <input
              type="text"
              className="input"
              placeholder={t('countdown', 'titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!isEdit}
            />
          </div>

          <div className="field">
            <label className="field-label">{t('countdown', 'targetDate')}</label>
            <input
              type="date"
              className="input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">
              {t('common', 'notes')}
              <span className="optional-hint"> {t('common', 'optional')}</span>
            </label>
            <textarea
              className="input"
              rows={3}
              placeholder={t('countdown', 'notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">{t('common', 'tags')}</label>
            <TagInput tags={tags} onChange={setTags} suggestions={allTags} />
          </div>

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
