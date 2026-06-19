import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Star, Tag, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import BookmarkCard from '../components/BookmarkCard'
import BookmarkModal from '../components/BookmarkModal'
import type { Bookmark } from '../types'

export default function BookmarksPage() {
  const { t, user } = useAppStore()
  const { bookmarks, loading, init, teardown } = useBookmarkStore()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Bookmark | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    bookmarks.forEach((b) => b.tags.forEach((t) => set.add(t)))
    return [...set].sort()
  }, [bookmarks])

  const filtered = useMemo(() => {
    return bookmarks.filter((b) => {
      if (showFavOnly && !b.isFavourite) return false
      if (filterTag && !b.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          (b.description || '').toLowerCase().includes(q) ||
          b.tags.some((t) => t.includes(q))
        )
      }
      return true
    })
  }, [bookmarks, search, filterTag, showFavOnly])

  const openAdd = () => { setEditTarget(undefined); setShowModal(true) }
  const openEdit = (b: Bookmark) => { setEditTarget(b); setShowModal(true) }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('bookmark', 'title')}</h1>
        <span className="item-count">{bookmarks.length}</span>
      </header>

      <div className="search-bar" style={{ margin: '12px 16px 8px' }}>
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder={t('common', 'search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="icon-btn" onClick={() => setSearch('')}><X size={14} /></button>
        )}
      </div>

      <div className="filter-bar">
        <button
          className={`filter-chip ${showFavOnly ? 'active' : ''}`}
          onClick={() => setShowFavOnly(!showFavOnly)}
        >
          <Star size={13} fill={showFavOnly ? 'currentColor' : 'none'} />
          {t('common', 'favourites')}
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            className={`filter-chip ${filterTag === tag ? 'active' : ''}`}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
          >
            <Tag size={11} />
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-page">
          <p className="loading-text">{t('common', 'loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-page">
          <div className="empty-icon-wrap">🔗</div>
          <p>{bookmarks.length === 0 ? '未有網址，點右下角新增' : t('common', 'noResults')}</p>
        </div>
      ) : (
        <div className="card-list">
          {filtered.map((b) => (
            <BookmarkCard key={b.id} bookmark={b} onEdit={openEdit} />
          ))}
        </div>
      )}

      <button className="fab" onClick={openAdd} aria-label={t('bookmark', 'add')}>
        <Plus size={24} />
      </button>

      {showModal && (
        <BookmarkModal
          bookmark={editTarget}
          onClose={() => setShowModal(false)}
          allTags={allTags}
        />
      )}
    </div>
  )
}
