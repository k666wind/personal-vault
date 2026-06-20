import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Star, Tag, X, Lock, RefreshCw } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { usePasswordStore } from '../stores/passwordStore'
import PasswordCard from '../components/PasswordCard'
import PasswordModal from '../components/PasswordModal'
import PasswordLockScreen from '../components/PasswordLockScreen'
import ChangeMasterPasswordModal from '../components/ChangeMasterPasswordModal'
import type { PasswordEntry } from '../types'

export default function PasswordsPage() {
  const { t, user, settings } = useAppStore()
  const { entries, loading, error, isLocked, lock, init, teardown, checkIdleTimeout, recordActivity } = usePasswordStore()

  const [showModal, setShowModal] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [editTarget, setEditTarget] = useState<PasswordEntry | undefined>()
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFavOnly, setShowFavOnly] = useState(false)
  

  useEffect(() => {
    if (user) init(user.uid)
    return () => teardown()
  }, [user?.uid])

  // Idle timeout check
  useEffect(() => {
    if (isLocked) return
    const interval = setInterval(() => {
      checkIdleTimeout(settings.passwordLockTimeout)
    }, 30_000)
    return () => clearInterval(interval)
  }, [isLocked, settings.passwordLockTimeout])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    entries.forEach((e) => (e.tags || []).forEach((t) => set.add(t)))
    return [...set].sort()
  }, [entries.map(e => e.tags?.join(',')).join('|')])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (showFavOnly && !e.isFavourite) return false
      if (filterTag && !e.tags.includes(filterTag)) return false
      if (search) {
        const q = search.toLowerCase()
        return e.site.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || e.tags.some((t) => t.includes(q))
      }
      return true
    })
  }, [entries, search, filterTag, showFavOnly])

  const openAdd = () => { setEditTarget(undefined); setShowModal(true) }
  const openEdit = (e: PasswordEntry) => { setEditTarget(e); setShowModal(true) }

  if (isLocked) {
    return <PasswordLockScreen onUnlocked={() => {}} />
  }

  const renderContent = () => {
    if (loading) return (
      <div className="empty-page"><div className="spinner" /><p className="loading-text">{t('common', 'loading')}</p></div>
    )
    if (error === 'index-building') return (
      <div className="empty-page">
        <RefreshCw size={36} className="empty-icon building-icon" />
        <p className="error-state-title">Firebase Index 建立中</p>
        <p className="error-state-hint">通常需要 1–3 分鐘</p>
        <button className="btn-outline-sm" onClick={() => user && init(user.uid)}>重新嘗試</button>
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
        {filtered.map((e) => <PasswordCard key={e.id} entry={e} onEdit={openEdit} />)}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>{t('password', 'title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="item-count">{entries.length}</span>
          <button className="btn-outline-sm" style={{fontSize:11,padding:'4px 8px'}} onClick={() => setShowChangePw(true)}>
            更換主密碼
          </button>
          <button className="icon-btn" onClick={lock} title={t('password', 'lock')}>
            <Lock size={18} />
          </button>
        </div>
      </header>

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

      <button className="fab" onClick={openAdd}><Plus size={24} /></button>

      {showModal && (
        <PasswordModal entry={editTarget} onClose={() => setShowModal(false)} allTags={allTags} />
      )}
      {showChangePw && (
        <ChangeMasterPasswordModal onClose={() => setShowChangePw(false)} />
      )}
    </div>
  )
}
