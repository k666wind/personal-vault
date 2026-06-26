import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Star, Tag, X, RefreshCw, CheckSquare } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import BookmarkCard from '../components/BookmarkCard'
import BookmarkModal from '../components/BookmarkModal'
import BulkActionBar from '../components/BulkActionBar'
import type { Bookmark } from '../types'

export default function BookmarksPage() {
  const { t, user } = useAppStore()
  const { bookmarks, loading, error, init, teardown, update, remove } = useBookmarkStore()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Bookmark | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    bookmarks.forEach((b) => (b.tags || []).forEach((tg) => set.add(tg)))
    return [...set].sort()
  }, [bookmarks])

  const filtered = useMemo(() => {
    return bookmarks.filter((b) => {
      if (showFavOnly && !b.isFavourite) return false
      if (filterTag && !b.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) ||
          (b.description || '').toLowerCase().includes(q) || b.tags.some((tg) => tg.includes(q))
      }
      return true
    })
  }, [bookmarks, search, filterTag, showFavOnly])

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const handleBulkDelete = async () => {
    if (!confirm(t('bulk', 'confirmDelete'))) return
    await Promise.all([...selected].map((id) => remove(id)))
    setSelected(new Set())
    setBulkMode(false)
  }

  const handleBulkAddTag = async (tag: string) => {
    await Promise.all(
      [...selected].map((id) => {
        const item = bookmarks.find((b) => b.id === id)
        if (!item || item.tags.includes(tag)) return Promise.resolve()
        return update(id, { tags: [...item.tags, tag] })
      })
    )
  }


  // PWA Shortcut: ?action=add auto-opens add modal
  const [searchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowModal(true)
    }
  }, [searchParams])

  const openAdd = () => { setEditTarget(undefined); setShowModal(true) }
  const openEdit = (b: Bookmark) => {
    if (bulkMode) { toggleSelect(b.id); return }
    setEditTarget(b); setShowModal(true)
  }

  const renderContent = () => {
    if (loading) return <div className="empty-page"><div className="spinner" /><p className="loading-text">{t('common', 'loading')}</p></div>
    if (error === 'index-building') return (
      <div className="empty-page">
        <RefreshCw size={36} className="empty-icon building-icon" />
        <p className="error-state-title">{t('error', 'indexBuilding')}</p>
        <p className="error-state-hint">{t('error', 'indexHint')}</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>{t('error', 'retryAgain')}</button>
      </div>
    )
    if (error) return (
      <div className="empty-page">
        <p className="error-state-title">{t('error', 'loadFailed')}</p>
        <p className="error-state-hint">{error}</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>{t('error', 'retry')}</button>
      </div>
    )
    if (filtered.length === 0) return (
      <div className="empty-page">
        <div className="empty-icon-wrap">🔗</div>
        <p>{bookmarks.length === 0 ? '未有網址，點右下角新增' : t('common', 'noResults')}</p>
      </div>
    )
    return (
      <div className="card-list">
        {filtered.map((b) => (
          <div key={b.id} className={`selectable-wrap ${bulkMode && selected.has(b.id) ? 'selected' : ''}`}
            onClick={bulkMode ? () => toggleSelect(b.id) : undefined}>
            {bulkMode && (
              <div className="select-check">
                {selected.has(b.id)
                  ? <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                  : <div className="select-circle" />}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <BookmarkCard bookmark={b} onEdit={openEdit} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('bookmark', 'title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn" title={t('tagManager', 'title')} onClick={() => navigate('/tags')}>
            <Tag size={18} />
          </button>
          <button className="icon-btn" title={t('bulk', 'select')} onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()) }}>
            <CheckSquare size={18} style={{ color: bulkMode ? 'var(--color-primary)' : undefined }} />
          </button>
          <span className="item-count">{bookmarks.length}</span>
        </div>
      </header>

      {bulkMode && (
        <BulkActionBar
          selectedCount={selected.size}
          totalCount={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map((b) => b.id)))}
          onDeselectAll={() => setSelected(new Set())}
          onDelete={handleBulkDelete}
          onAddTag={handleBulkAddTag}
          onCancel={() => { setBulkMode(false); setSelected(new Set()) }}
          allTags={allTags}
        />
      )}

      <div className="search-bar" style={{ margin: '12px 16px 8px' }}>
        <Search size={16} className="search-icon" />
        <input type="text" className="search-input" placeholder={t('common', 'search')}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button className="icon-btn" onClick={() => setSearch('')}><X size={14} /></button>}
      </div>

      <div className="filter-bar">
        <button className={`filter-chip ${showFavOnly ? 'active' : ''}`} onClick={() => setShowFavOnly(!showFavOnly)}>
          <Star size={13} fill={showFavOnly ? 'currentColor' : 'none'} />{t('common', 'favourites')}
        </button>
        {allTags.map((tag) => (
          <button key={tag} className={`filter-chip ${filterTag === tag ? 'active' : ''}`}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}>
            <Tag size={11} />{tag}
          </button>
        ))}
      </div>

      {renderContent()}

      {!bulkMode && (
        <button className="fab" onClick={openAdd} aria-label={t('bookmark', 'add')}><Plus size={24} /></button>
      )}

      {showModal && (
        <BookmarkModal bookmark={editTarget} onClose={() => setShowModal(false)} allTags={allTags} />
      )}
    </div>
  )
}
