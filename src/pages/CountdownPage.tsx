import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Star, Tag, X, CheckSquare, Pin } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { useCountdownStore } from '../stores/countdownStore'
import CountdownCard from '../components/CountdownCard'
import CountdownModal from '../components/CountdownModal'
import BulkActionBar from '../components/BulkActionBar'
import ConfirmDialog from '../components/ConfirmDialog'
import type { DateCountdown } from '../types'

export default function CountdownPage() {
  const { t, user } = useAppStore()
  const { items, loading, error, subscribe, cleanup, update, remove } = useCountdownStore()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<DateCountdown | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [showPinOnly, setShowPinOnly] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)

  useEffect(() => {
    if (user) subscribe(user.uid)
    return () => cleanup()
  }, [user?.uid])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => (i.tags || []).forEach((tg) => set.add(tg)))
    return [...set].sort()
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (showFavOnly && !i.isFavourite) return false
      if (showPinOnly && !i.isPinned) return false
      if (filterTag && !i.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return i.title.toLowerCase().includes(q) || (i.notes || '').toLowerCase().includes(q) ||
          i.tags.some((tg) => tg.includes(q))
      }
      return true
    })
  }, [items, search, filterTag, showFavOnly, showPinOnly])

  const sorted = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const todayMs = today.getTime()
    const upcoming = filtered.filter((i) => i.targetDate >= todayMs).sort((a, b) => a.targetDate - b.targetDate)
    const past = filtered.filter((i) => i.targetDate < todayMs).sort((a, b) => b.targetDate - a.targetDate)
    const all = [...upcoming, ...past]
    // F-03: pinned items always appear first
    return [...all.filter((i) => i.isPinned), ...all.filter((i) => !i.isPinned)]
  }, [filtered])

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
      const item = items.find((i) => i.id === id)
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
  const openEdit = (i: DateCountdown) => {
    if (bulkMode) { toggleSelect(i.id); return }
    setEditTarget(i); setShowModal(true)
  }

  const renderContent = () => {
    if (loading) return <div className="empty-page"><div className="spinner" /><p className="loading-text">{t('common', 'loading')}</p></div>
    if (error) return (
      <div className="empty-page">
        <p className="error-state-title">{t('error', 'loadFailed')}</p>
        <p className="error-state-hint">{error}</p>
        <button className="btn-outline-sm" onClick={() => user && subscribe(user.uid)}>{t('error', 'retry')}</button>
      </div>
    )
    if (sorted.length === 0) return (
      <div className="empty-page">
        <div className="empty-icon-wrap">📅</div>
        <p>{items.length === 0 ? t('countdown', 'noItems') : t('common', 'noResults')}</p>
      </div>
    )
    return (
      <div className="card-list">
        {sorted.map((i) => (
          <div key={i.id} className={`selectable-wrap ${bulkMode && selected.has(i.id) ? 'selected' : ''}`}
            onClick={bulkMode ? () => toggleSelect(i.id) : undefined}>
            {bulkMode && (
              <div className="select-check">
                {selected.has(i.id)
                  ? <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                  : <div className="select-circle" />}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <CountdownCard item={i} onEdit={openEdit} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('countdown', 'title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn" onClick={() => navigate('/tags')}><Tag size={18} /></button>
          <button className="icon-btn" onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()) }}>
            <CheckSquare size={18} style={{ color: bulkMode ? 'var(--color-primary)' : undefined }} />
          </button>
          <span className="item-count">{items.length}</span>
        </div>
      </header>

      {bulkMode && (
        <BulkActionBar
          selectedCount={selected.size} totalCount={sorted.length}
          onSelectAll={() => setSelected(new Set(sorted.map((i) => i.id)))}
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
        <button className="fab" onClick={openAdd}><Plus size={24} /></button>
      )}

      {showModal && (
        <CountdownModal item={editTarget} onClose={() => setShowModal(false)} allTags={allTags} />
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
