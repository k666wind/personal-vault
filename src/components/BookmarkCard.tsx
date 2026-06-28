import { useState } from 'react'
import { Star, ExternalLink, Edit2, Trash2, Pin, PinOff, BookOpen, BookMarked } from 'lucide-react'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useAppStore } from '../stores/appStore'
import { getDomain } from '../lib/urlMeta'
import ConfirmDialog from './ConfirmDialog'
import type { Bookmark } from '../types'

interface Props {
  bookmark: Bookmark
  onEdit: (b: Bookmark) => void
}

export default function BookmarkCard({ bookmark, onEdit }: Props) {
  const { toggleFavourite, remove, update } = useBookmarkStore()
  const { t } = useAppStore()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
    <div className="card bookmark-card">
      <div className="bookmark-card-top">
        {/* Favicon + domain */}
        <div className="bookmark-meta">
          {bookmark.favicon ? (
            <img
              src={bookmark.favicon}
              alt=""
              className="favicon"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="favicon-placeholder">🔗</div>
          )}
          <span className="bookmark-domain">{getDomain(bookmark.url)}</span>
        </div>

        {/* Actions */}
        <div className="card-actions">
          <button
            className="icon-btn"
            onClick={() => update(bookmark.id, { isPinned: !bookmark.isPinned })}
            aria-label={bookmark.isPinned ? t('common', 'unpin') : t('common', 'pin')}
          >
            {bookmark.isPinned
              ? <PinOff size={15} style={{ color: 'var(--color-primary)' }} />
              : <Pin size={15} />}
          </button>
          <button
            className="icon-btn"
            onClick={() => update(bookmark.id, { isRead: !bookmark.isRead })}
            aria-label={bookmark.isRead ? '標記未讀' : '標記已讀'}
            title={bookmark.isRead ? '標記未讀' : '標記已讀'}
          >
            {bookmark.isRead
              ? <BookMarked size={15} style={{ color: 'var(--color-primary)' }} />
              : <BookOpen size={15} />}
          </button>
          <button
            className={`icon-btn star-btn ${bookmark.isFavourite ? 'starred' : ''}`}
            onClick={() => toggleFavourite(bookmark.id, bookmark.isFavourite)}
            aria-label={t('common', 'favourite')}
          >
            <Star size={17} fill={bookmark.isFavourite ? 'currentColor' : 'none'} />
          </button>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="icon-btn"
            aria-label={t('bookmark', 'openLink')}
          >
            <ExternalLink size={17} />
          </a>
          <button className="icon-btn" onClick={() => onEdit(bookmark)} aria-label={t('common', 'edit')}>
            <Edit2 size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowConfirm(true)}
            aria-label={t('common', 'delete')}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="bookmark-title" style={{ opacity: bookmark.isRead ? 0.6 : 1 }}>{bookmark.title}</h3>

      {/* Description */}
      {bookmark.description && (
        <p className="bookmark-desc">{bookmark.description}</p>
      )}

      {/* Tags */}
      {bookmark.tags.length > 0 && (
        <div className="tags-row">
          {bookmark.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
    {showConfirm && (
      <ConfirmDialog
        message={t('common', 'confirmDelete')}
        onConfirm={() => { setShowConfirm(false); remove(bookmark.id) }}
        onCancel={() => setShowConfirm(false)}
      />
    )}
    </>
  )
}
