import { Star, Bell, Pencil, Trash2 } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useCountdownStore } from '../stores/countdownStore'
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
  const { t } = useAppStore()
  const { update, remove } = useCountdownStore()
  const diff = getDayDiff(item.targetDate)

  const isPast = diff < 0
  const isToday = diff === 0

  const accentColor = isPast
    ? 'var(--color-error)'
    : isToday
    ? 'var(--color-success)'
    : 'var(--color-primary)'

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(t('common', 'confirmDelete'))) {
      await remove(item.id)
    }
  }

  const handleFav = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await update(item.id, { isFavourite: !item.isFavourite })
  }

  return (
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
          <p className="card-title">{item.title}</p>
          <p className="countdown-date">
            {new Date(item.targetDate).toLocaleDateString(
              t('nav', 'home') === 'Home' ? 'en-GB' : 'zh-HK',
              { year: 'numeric', month: 'long', day: 'numeric' }
            )}
          </p>
          {item.notes && <p className="card-desc">{item.notes}</p>}
          {item.tags.length > 0 && (
            <div className="card-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          )}
          {item.reminderAt && (
            <div className="card-meta">
              <Bell size={11} />
              {new Date(item.reminderAt).toLocaleString(
                t('nav', 'home') === 'Home' ? 'en-GB' : 'zh-HK',
                { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card-actions">
        <button className="icon-btn" onClick={handleFav}>
          <Star size={16} fill={item.isFavourite ? 'currentColor' : 'none'} style={{ color: item.isFavourite ? '#f59e0b' : undefined }} />
        </button>
        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onEdit(item) }}>
          <Pencil size={15} />
        </button>
        <button className="icon-btn" onClick={handleDelete}>
          <Trash2 size={15} style={{ color: 'var(--color-error)' }} />
        </button>
      </div>
    </div>
  )
}
