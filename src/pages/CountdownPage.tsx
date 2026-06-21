import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Star, Tag, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useCountdownStore } from '../stores/countdownStore'
import CountdownCard from '../components/CountdownCard'
import CountdownModal from '../components/CountdownModal'
import type { DateCountdown } from '../types'

export default function CountdownPage() {
  const { t, user } = useAppStore()
  const { items, loading, error, subscribe, cleanup } = useCountdownStore()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<DateCountdown | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)

  useEffect(() => {
    if (user) subscribe(user.uid)
    return () => cleanup()
  }, [user?.uid])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => (i.tags || []).forEach((tag) => set.add(tag)))
    return [...set].sort()
  }, [items])

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (showFavOnly && !i.isFavourite) return false
      if (filterTag && !i.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          i.title.toLowerCase().includes(q) ||
          (i.notes || '').toLowerCase().includes(q) ||
          i.tags.some((tag) => tag.includes(q))
        )
      }
      return true
    })
  }, [items, search, filterTag, showFavOnly])

  // Sort: upcoming first (ascending), then past (most recent past first)
  const sorted = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()

    const upcoming = filtered.filter((i) => i.targetDate >= todayMs).sort((a, b) => a.targetDate - b.targetDate)
    const past = filtered.filter((i) => i.targetDate < todayMs).sort((a, b) => b.targetDate - a.targetDate)
    return [...upcoming, ...past]
  }, [filtered])

  const openAdd = () => { setEditTarget(undefined); setShowModal(true) }
  const openEdit = (i: DateCountdown) => { setEditTarget(i); setShowModal(true) }

  const renderContent = () => {
    if (loading) return (
      <div className="empty-page"><div className="spinner" /><p className="loading-text">{t('common', 'loading')}</p></div>
    )
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
        {sorted.map((i) => <CountdownCard key={i.id} item={i} onEdit={openEdit} />)}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('countdown', 'title')}</h1>
        <span className="item-count">{items.length}</span>
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

      <button className="fab" onClick={openAdd} aria-label={t('countdown', 'add')}>
        <Plus size={24} />
      </button>

      {showModal && (
        <CountdownModal
          item={editTarget}
          onClose={() => setShowModal(false)}
          allTags={allTags}
        />
      )}
    </div>
  )
}
