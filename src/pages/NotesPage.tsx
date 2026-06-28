import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Star, Tag, X, RefreshCw, CheckSquare, Pin } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useNoteStore } from '../stores/noteStore'
import NoteCard from '../components/NoteCard'
import NoteModal from '../components/NoteModal'
import BulkActionBar from '../components/BulkActionBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Note } from '../types'

export default function NotesPage() {
  const { t, user } = useAppStore()
  const { notes, loading, error, init, teardown, update, remove } = useNoteStore()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Note | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [showPinOnly, setShowPinOnly] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => (n.tags || []).forEach((tg) => set.add(tg)))
    return [...set].sort()
  }, [notes])

  const filtered = useMemo(() => {
    const f = notes.filter((n) => {
      if (showFavOnly && !n.isFavourite) return false
      if (showPinOnly && !n.isPinned) return false
      if (filterTag && !n.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) ||
          n.tags.some((tg) => tg.includes(q))
      }
      return true
    })
    // F-03: pinned items always appear first
    return [...f.filter((n) => n.isPinned), ...f.filter((n) => !n.isPinned)]
  }, [notes, search, filterTag, showFavOnly, showPinOnly])

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selected].map((id) => remove(id)))
      setSelected(new Set()); setBulkMode(false)
    } catch {
      alert(t('error', 'saveFailed'))
    }
  }

  const handleBulkAddTag = async (tag: string) => {
    await Promise.all([...selected].map((id) => {
      const item = notes.find((n) => n.id === id)
      if (!item || item.tags.includes(tag)) return Promise.resolve()
      return update(id, { tags: [...item.tags, tag] })
    }))
  }

  // PWA Shortcut: ?action=add auto-opens add modal
  const [searchParams] = useSearchParams()
  const actionParam = searchParams.get('action')
  useEffect(() => {
    if (actionParam === 'add') setShowModal(true)
  }, [actionParam])

  const openAdd = () => { setEditTarget(undefined); setShowModal(true) }
  const openEdit = (n: Note) => {
    if (bulkMode) { toggleSelect(n.id); return }
    setEditTarget(n); setShowModal(true)
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
        <div className="empty-icon-wrap">📝</div>
        <p>{notes.length === 0 ? '未有筆記，點右下角新增' : t('common', 'noResults')}</p>
      </div>
    )
    return (
      <div className="card-list">
        {filtered.map((n) => (
          <div key={n.id} className={`selectable-wrap ${bulkMode && selected.has(n.id) ? 'selected' : ''}`}
            onClick={bulkMode ? () => toggleSelect(n.id) : undefined}>
            {bulkMode && (
              <div className="select-check">
                {selected.has(n.id)
                  ? <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                  : <div className="select-circle" />}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <NoteCard note={n} onEdit={openEdit} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('note', 'title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn" onClick={() => navigate('/tags')}>
            <Tag size={18} />
          </button>
          <button className="icon-btn" onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()) }}>
            <CheckSquare size={18} style={{ color: bulkMode ? 'var(--color-primary)' : undefined }} />
          </button>
          <span className="item-count">{notes.length}</span>
        </div>
      </header>

      {bulkMode && (
        <BulkActionBar
          selectedCount={selected.size} totalCount={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map((n) => n.id)))}
          onDeselectAll={() => setSelected(new Set())}
          onDelete={() => setShowBulkConfirm(true)} onAddTag={handleBulkAddTag}
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
        <button className={`filter-chip ${showPinOnly ? 'active' : ''}`} onClick={() => setShowPinOnly(!showPinOnly)}>
          <Pin size={13} />{t('common', 'pinned')}
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
        <button className="fab" onClick={openAdd} aria-label={t('note', 'add')}><Plus size={24} /></button>
      )}

      {showModal && (
        <NoteModal
          note={editTarget}
          onClose={() => setShowModal(false)}
          allTags={allTags}
          onSearchNote={(title) => { setShowModal(false); setSearch(title) }}
        />
      )}
      {showBulkConfirm && (
        <ConfirmDialog
          message={t('bulk', 'confirmDelete')}
          onConfirm={() => { setShowBulkConfirm(false); handleBulkDelete() }}
          onCancel={() => setShowBulkConfirm(false)}
        />
      )}
    </div>
  )
}
