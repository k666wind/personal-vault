import { useState } from 'react'
import { Star, Edit2, Trash2, Bell, Pin, PinOff } from 'lucide-react'
import { useNoteStore } from '../stores/noteStore'
import { useAppStore } from '../stores/appStore'
import ConfirmDialog from './ConfirmDialog'
import type { Note } from '../types'

interface Props {
  note: Note
  onEdit: (n: Note) => void
}

export default function NoteCard({ note, onEdit }: Props) {
  const { toggleFavourite, remove, update } = useNoteStore()
  const { t } = useAppStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const isLong = note.content.length > 200
  const displayContent = isLong && !expanded
    ? note.content.slice(0, 200) + '...'
    : note.content

  const hasReminder = !!note.reminderAt
  const reminderPast = hasReminder && note.reminderAt! < Date.now()

  return (
    <>
    <div className="card note-card">
      <div className="note-card-top">
        <h3 className="note-title">
            {note.isPinned && <Pin size={11} style={{ color: 'var(--color-primary)', marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />}
            {note.title}
          </h3>
        <div className="card-actions">
          <button
            className={`icon-btn ${note.isPinned ? 'pinned-btn' : ''}`}
            onClick={() => update(note.id, { isPinned: !note.isPinned })}
            title={note.isPinned ? t('common', 'unpin') : t('common', 'pin')}
          >
            {note.isPinned ? <PinOff size={15} style={{ color: 'var(--color-primary)' }} /> : <Pin size={15} />}
          </button>
          <button
            className={`icon-btn star-btn ${note.isFavourite ? 'starred' : ''}`}
            onClick={() => toggleFavourite(note.id, note.isFavourite)}
          >
            <Star size={17} fill={note.isFavourite ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-btn" onClick={() => onEdit(note)}>
            <Edit2 size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {note.content && (
        <div className="note-content-wrap">
          <p className="note-content">{displayContent}</p>
          {isLong && (
            <button className="note-expand-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? '收起' : '展開'}
            </button>
          )}
        </div>
      )}

      <div className="note-footer">
        {hasReminder && (
          <span className={`reminder-chip ${reminderPast ? 'reminder-past' : ''}`}>
            <Bell size={11} />
            {new Date(note.reminderAt!).toLocaleDateString('zh-HK', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </span>
        )}
        {note.tags.length > 0 && (
          <div className="tags-row">
            {note.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
    {showConfirm && (
      <ConfirmDialog
        message={t('common', 'confirmDelete')}
        onConfirm={() => { setShowConfirm(false); remove(note.id) }}
        onCancel={() => setShowConfirm(false)}
      />
    )}
    </>
  )
}
