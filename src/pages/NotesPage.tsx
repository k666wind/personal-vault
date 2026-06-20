import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Star, Tag, X, RefreshCw } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useNoteStore } from '../stores/noteStore'
import NoteCard from '../components/NoteCard'
import NoteModal from '../components/NoteModal'
import type { Note } from '../types'

export default function NotesPage() {
  const { t, user } = useAppStore()
  const { notes, loading, error, init, teardown } = useNoteStore()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Note | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => (n.tags || []).forEach((t) => set.add(t)))
    return [...set].sort()
  }, [notes.map(n => n.tags?.join(',')).join('|')])

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (showFavOnly && !n.isFavourite) return false
      if (filterTag && !n.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.includes(q))
        )
      }
      return true
    })
  }, [notes, search, filterTag, showFavOnly])

  const openAdd = () => { setEditTarget(undefined); setShowModal(true) }
  const openEdit = (n: Note) => { setEditTarget(n); setShowModal(true) }

  const renderContent = () => {
    if (loading) return (
      <div className="empty-page"><div className="spinner" /><p className="loading-text">{t('common', 'loading')}</p></div>
    )
    if (error === 'index-building') return (
      <div className="empty-page">
        <RefreshCw size={36} className="empty-icon building-icon" />
        <p className="error-state-title">Firebase Index 建立中</p>
        <p className="error-state-hint">通常需要 1–3 分鐘，完成後自動載入</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>重新嘗試</button>
      </div>
    )
    if (error) return (
      <div className="empty-page">
        <p className="error-state-title">載入失敗</p>
        <p className="error-state-hint">{error}</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>重試</button>
      </div>
    )
    if (filtered.length === 0) return (
      <div className="empty-page">
        <div className="empty-icon-wrap">📝</div>
        <p>{notes.length === 0 ? '未有筆記，點右下角新增' : t('common', 'noResults')}</p>
      </div>
    )
    return (
      <div className="card-list">
        {filtered.map((n) => <NoteCard key={n.id} note={n} onEdit={openEdit} />)}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('note', 'title')}</h1>
        <span className="item-count">{notes.length}</span>
      </header>

      <div className="search-bar" style={{ margin: '12px 16px 8px' }}>
        <Search size={16} className="search-icon" />
        <input type="text" className="search-input" placeholder={t('common', 'search')}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button className="icon-btn" onClick={() => setSearch('')}><X size={14} /></button>}
      </div>

      <div className="filter-bar">
        <button className={`filter-chip ${showFavOnly ? 'active' : ''}`} onClick={() => setShowFavOnly(!showFavOnly)}>
          <Star size={13} fill={showFavOnly ? 'currentColor' : 'none'} />
          {t('common', 'favourites')}
        </button>
        {allTags.map((tag) => (
          <button key={tag} className={`filter-chip ${filterTag === tag ? 'active' : ''}`}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}>
            <Tag size={11} />{tag}
          </button>
        ))}
      </div>

      {renderContent()}

      <button className="fab" onClick={openAdd}><Plus size={24} /></button>

      {showModal && (
        <NoteModal note={editTarget} onClose={() => setShowModal(false)} allTags={allTags} />
      )}
    </div>
  )
}
