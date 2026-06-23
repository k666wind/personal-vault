import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Star, Tag, X, Lock, RefreshCw, ShieldCheck, CheckSquare } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { usePasswordStore } from '../stores/passwordStore'
import PasswordCard from '../components/PasswordCard'
import PasswordModal from '../components/PasswordModal'
import PasswordLockScreen from '../components/PasswordLockScreen'
import ChangeMasterPasswordModal from '../components/ChangeMasterPasswordModal'
import BulkActionBar from '../components/BulkActionBar'
import type { PasswordEntry } from '../types'

export default function PasswordsPage() {
  const { t, user, settings } = useAppStore()
  const { entries, loading, error, isLocked, lock, init, teardown, checkIdleTimeout, recordActivity, remove, updateFields } = usePasswordStore()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [editTarget, setEditTarget] = useState<PasswordEntry | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  useEffect(() => {
    if (isLocked) return
    const interval = setInterval(() => checkIdleTimeout(settings.passwordLockTimeout), 30_000)
    return () => clearInterval(interval)
  }, [isLocked, settings.passwordLockTimeout])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    entries.forEach((e) => (e.tags || []).forEach((tg) => set.add(tg)))
    return [...set].sort()
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (showFavOnly && !e.isFavourite) return false
      if (filterTag && !e.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return e.site.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) ||
          e.tags.some((tg) => tg.includes(q))
      }
      return true
    })
  }, [entries, search, filterTag, showFavOnly])

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const handleBulkDelete = async () => {
    if (!confirm(t('bulk', 'confirmDelete'))) return
    await Promise.all([...selected].map((id) => remove(id)))
    setSelected(new Set()); setBulkMode(false)
  }

  const handleBulkAddTag = async (tag: string) => {
    await Promise.all([...selected].map((id) => {
      const item = entries.find((e) => e.id === id)
      if (!item || item.tags.includes(tag)) return Promise.resolve()
      return updateFields(id, { tags: [...item.tags, tag] })
    }))
  }

  const openAdd = () => { setEditTarget(undefined); setShowModal(true) }
  const openEdit = (e: PasswordEntry) => {
    if (bulkMode) { toggleSelect(e.id); return }
    setEditTarget(e); setShowModal(true)
  }

  if (isLocked) return <PasswordLockScreen onUnlocked={() => {}} />

  const renderContent = () => {
    if (loading) return (
      <div className="empty-page"><div className="spinner" /><p className="loading-text">{t('common', 'loading')}</p></div>
    )
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
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>{t('error', 'retry')}</button>
      </div>
    )
    if (filtered.length === 0) return (
      <div className="empty-page">
        <div className="empty-icon-wrap">🔐</div>
        <p>{entries.length === 0 ? '未有密碼，點右下角新增' : t('common', 'noResults')}</p>
      </div>
    )
    return (
      <div className="card-list" onClick={recordActivity}>
        {filtered.map((e) => (
          <div key={e.id} className={`selectable-wrap ${bulkMode && selected.has(e.id) ? 'selected' : ''}`}
            onClick={bulkMode ? () => toggleSelect(e.id) : undefined}>
            {bulkMode && (
              <div className="select-check">
                {selected.has(e.id)
                  ? <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />
                  : <div className="select-circle" />}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <PasswordCard entry={e} onEdit={openEdit} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('password', 'title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="icon-btn" onClick={() => navigate('/passwords/health')} title={t('password', 'health')}>
            <ShieldCheck size={18} />
          </button>
          <button className="icon-btn" onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()) }}>
            <CheckSquare size={18} style={{ color: bulkMode ? 'var(--color-primary)' : undefined }} />
          </button>
          <button className="icon-btn" onClick={lock} title={t('password', 'lock')}>
            <Lock size={18} />
          </button>
          <span className="item-count">{entries.length}</span>
        </div>
      </header>

      <div style={{ padding: '6px 16px 0', display: 'flex', gap: 8 }}>
        <button className="btn-outline-sm" style={{ fontSize: 11 }} onClick={() => setShowChangePw(true)}>
          {t('password', 'changeMaster')}
        </button>
      </div>

      {bulkMode && (
        <BulkActionBar
          selectedCount={selected.size} totalCount={filtered.length}
          onSelectAll={() => setSelected(new Set(filtered.map((e) => e.id)))}
          onDeselectAll={() => setSelected(new Set())}
          onDelete={handleBulkDelete} onAddTag={handleBulkAddTag}
          onCancel={() => { setBulkMode(false); setSelected(new Set()) }}
          allTags={allTags}
        />
      )}

      <div className="search-bar" style={{ margin: '10px 16px 8px' }}>
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

      {!bulkMode && <button className="fab" onClick={openAdd}><Plus size={24} /></button>}

      {showModal && <PasswordModal entry={editTarget} onClose={() => setShowModal(false)} allTags={allTags} />}
      {showChangePw && <ChangeMasterPasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  )
}
