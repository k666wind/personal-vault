import { useState } from 'react'
import { Star, Bell, Pencil, Trash2, Pin, PinOff, Repeat } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useCountdownStore } from '../stores/countdownStore'
import ConfirmDialog from './ConfirmDialog'
import type { DateCountdown } from '../types'

interface Props {
  item: DateCountdown
  onEdit: (item: DateCountdown) => void
}

function getDayDiff(targetMs: number): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetMs)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function CountdownCard({ item, onEdit }: Props) {
  const { t, settings } = useAppStore()
  const { update, remove } = useCountdownStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const diff = getDayDiff(item.targetDate)

  const isPast = diff < 0
  const isToday = diff === 0

  // BUG-31 FIX: derive locale from settings.language, consistent with other components
  const locale = settings.language === 'en' ? 'en-GB' : 'zh-HK'

  const accentColor = isPast
    ? 'var(--color-error)'
    : isToday
    ? 'var(--color-success)'
    : 'var(--color-primary)'

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(true)
  }

  const handleFav = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await update(item.id, { isFavourite: !item.isFavourite })
  }

  return (
  <>
    <div className="card countdown-card" style={{ borderLeft: `4px solid ${accentColor}` }}>
      <div className="card-main">
        <div className="countdown-left">
          <div className="countdown-number" style={{ color: accentColor }}>
            {isToday ? '🎉' : Math.abs(diff)}
          </div>
          <div className="countdown-label" style={{ color: accentColor }}>
            {isToday
              ? t('countdown', 'today')
              : isPast
              ? t('countdown', 'daysAgo')
              : t('countdown', 'daysLeft')}
          </div>
        </div>

        <div className="countdown-body">
          <p className="card-title">
            {item.isPinned && <Pin size={11} style={{ color: 'var(--color-primary)', marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />}
            {item.title}
          </p>
          <p className="countdown-date">
            {new Date(item.targetDate).toLocaleDateString(locale, {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
          {item.notes && <p className="card-desc">{item.notes}</p>}
          {(item.tags.length > 0 || item.recurrence) && (
            <div className="card-tags">
              {item.recurrence && (
                <span className="tag-chip" style={{ color: 'var(--color-primary)', background: 'var(--color-primary-light)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Repeat size={10} />
                  {item.recurrence === 'yearly' ? (lang === 'zh' ? '每年' : 'Yearly') : (lang === 'zh' ? '每月' : 'Monthly')}
                </span>
              )}
              {item.tags.map((tag) => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}
          {item.reminderAt && (
            <div className="card-meta">
              <Bell size={11} />
              {new Date(item.reminderAt).toLocaleString(locale, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card-actions">
        <button className="icon-btn" onClick={handleFav}>
          <Star size={16} fill={item.isFavourite ? 'currentColor' : 'none'}
            style={{ color: item.isFavourite ? '#f59e0b' : undefined }} />
        </button>
        <button
          className={`icon-btn ${item.isPinned ? 'pinned-btn' : ''}`}
          onClick={(e) => { e.stopPropagation(); update(item.id, { isPinned: !item.isPinned }) }}
          title={item.isPinned ? t('common', 'unpin') : t('common', 'pin')}
        >
          {item.isPinned ? <PinOff size={15} style={{ color: 'var(--color-primary)' }} /> : <Pin size={15} />}
        </button>
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onEdit(item) }}>
          <Pencil size={15} />
        </button>
        <button className="icon-btn" onClick={handleDelete}>
          <Trash2 size={15} style={{ color: 'var(--color-error)' }} />
        </button>
      </div>
    </div>
    {showConfirm && (
      <ConfirmDialog
        message={t('common', 'confirmDelete')}
        onConfirm={() => { setShowConfirm(false); remove(item.id) }}
        onCancel={() => setShowConfirm(false)}
      />
    )}
  </>
  )
}
