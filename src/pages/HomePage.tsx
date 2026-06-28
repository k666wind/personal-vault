import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, Bell, Settings, X, Sun, Moon, Plus, Link, FileText, ChevronUp } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useNoteStore } from '../stores/noteStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useCountdownStore } from '../stores/countdownStore'

export default function HomePage() {
  const { t, user, settings, setLanguage, setTheme } = useAppStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCapture, setShowCapture] = useState(false)
  const [captureTitle, setCaptureTitle] = useState('')
  const [captureUrl, setCaptureUrl] = useState('')
  const [captureMode, setCaptureMode] = useState<'note' | 'bookmark'>('note')

  const { bookmarks, init: initBm, teardown: tearBm, add: addBookmark } = useBookmarkStore()

  const { notes, init: initNt, teardown: tearNt, add: addNote } = useNoteStore()
  const { recipes, init: initRc, teardown: tearRc } = useRecipeStore()
  const { items: countdowns, subscribe: subCd, cleanup: cleanCd } = useCountdownStore()

  useEffect(() => {
    if (!user) return
    initBm(user.uid)
    initNt(user.uid)
    initRc(user.uid)
    subCd(user.uid)
    return () => { tearBm(); tearNt(); tearRc(); cleanCd() }
  }, [user?.uid])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('home', 'goodMorning') : hour < 18 ? t('home', 'goodAfternoon') : t('home', 'goodEvening')
  const displayName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const locale = settings.language === 'en' ? 'en-GB' : 'zh-HK'

  const moduleLabel: Record<string, string> = {
    bookmark: t('nav', 'bookmarks'),
    note: t('nav', 'notes'),
    recipe: t('nav', 'recipes'),
    password: t('nav', 'passwords'),
    countdown: t('nav', 'countdown'),
  }

  const moduleColors: Record<string, string> = {
    bookmark: 'var(--color-bookmark)',
    note: 'var(--color-note)',
    recipe: 'var(--color-recipe)',
    password: 'var(--color-password)',
    countdown: 'var(--color-countdown)',
  }

  // ── Global search ──────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const results: Array<{ id: string; module: string; title: string; subtitle: string; route: string }> = []
    bookmarks.forEach((b) => {
      if (b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) || b.tags.some(tg => tg.includes(q)))
        results.push({ id: b.id, module: 'bookmark', title: b.title, subtitle: b.url, route: '/bookmarks' })
    })
    notes.forEach((n) => {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(tg => tg.includes(q)))
        results.push({ id: n.id, module: 'note', title: n.title, subtitle: n.content.slice(0, 60), route: '/notes' })
    })
    recipes.forEach((r) => {
      if (r.title.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q) || r.tags.some(tg => tg.includes(q)) || r.ingredients.some(i => i.name.toLowerCase().includes(q)))
        results.push({ id: r.id, module: 'recipe', title: r.title, subtitle: r.description || '', route: '/recipes' })
    })
    countdowns.forEach((c) => {
      if (c.title.toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q) || c.tags.some(tg => tg.includes(q)))
        results.push({ id: c.id, module: 'countdown', title: c.title, subtitle: new Date(c.targetDate).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }), route: '/countdown' })
    })
    return results.slice(0, 10)
  }, [searchQuery, bookmarks, notes, recipes, countdowns, locale])

  // ── Favourites ─────────────────────────────────────────
  const favourites = useMemo(() => {
    const result: Array<{ id: string; module: string; title: string; route: string }> = []
    bookmarks.filter(b => b.isFavourite).forEach(b => result.push({ id: b.id, module: 'bookmark', title: b.title, route: '/bookmarks' }))
    notes.filter(n => n.isFavourite).forEach(n => result.push({ id: n.id, module: 'note', title: n.title, route: '/notes' }))
    recipes.filter(r => r.isFavourite).forEach(r => result.push({ id: r.id, module: 'recipe', title: r.title, route: '/recipes' }))
    countdowns.filter(c => c.isFavourite).forEach(c => result.push({ id: c.id, module: 'countdown', title: c.title, route: '/countdown' }))
    return result.slice(0, 6)
  }, [bookmarks, notes, recipes, countdowns])

  // ── Reminders — sorted soonest first, show year ────────
  const reminders = useMemo(() => {
    const now = Date.now()
    // Show: upcoming + overdue within last 7 days
    const cutoff = now - 7 * 24 * 60 * 60 * 1000
    const fromNotes = notes
      .filter(n => n.reminderAt && n.reminderAt > cutoff)
      .map(n => ({ id: n.id, title: n.title, reminderAt: n.reminderAt!, route: '/notes', overdue: n.reminderAt! < now }))
    const fromCountdowns = countdowns
      .filter(c => c.reminderAt && c.reminderAt > cutoff)
      .map(c => ({ id: c.id, title: c.title, reminderAt: c.reminderAt!, route: '/countdown', overdue: c.reminderAt! < now }))
    return [...fromNotes, ...fromCountdowns]
      .sort((a, b) => a.reminderAt - b.reminderAt)  // soonest first
  }, [notes, countdowns])

  // ── Recently updated items across all modules ──────────
  const recentlyUpdated = useMemo(() => {
    const all: Array<{ id: string; module: string; title: string; updatedAt: number; route: string }> = []
    bookmarks.forEach(b => all.push({ id: b.id, module: 'bookmark', title: b.title, updatedAt: b.updatedAt, route: '/bookmarks' }))
    notes.forEach(n => all.push({ id: n.id, module: 'note', title: n.title, updatedAt: n.updatedAt, route: '/notes' }))
    recipes.forEach(r => all.push({ id: r.id, module: 'recipe', title: r.title, updatedAt: r.updatedAt, route: '/recipes' }))
    countdowns.forEach(c => all.push({ id: c.id, module: 'countdown', title: c.title, updatedAt: c.updatedAt, route: '/countdown' }))
    return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)
  }, [bookmarks, notes, recipes, countdowns])

  // Format reminder date with year
  const formatReminder = (ms: number) => {
    const d = new Date(ms)
    return d.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format recent updated time
  const formatUpdated = (ms: number) => {
    const diff = Date.now() - ms
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return settings.language === 'en' ? 'Just now' : '剛剛'
    if (mins < 60) return settings.language === 'en' ? `${mins}m ago` : `${mins} 分鐘前`
    if (hours < 24) return settings.language === 'en' ? `${hours}h ago` : `${hours} 小時前`
    if (days < 7) return settings.language === 'en' ? `${days}d ago` : `${days} 日前`
    return new Date(ms).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const handleQuickCapture = async () => {
    if (!user || !captureTitle.trim()) return
    if (captureMode === 'note') {
      await addNote(user.uid, { title: captureTitle.trim(), content: '', tags: [], isFavourite: false, isPinned: false })
    } else {
      if (!captureUrl.trim()) return
      await addBookmark(user.uid, {
        url: captureUrl.trim(),
        title: captureTitle.trim(),
        description: '',
        favicon: '',
        tags: [],
        isFavourite: false,
        isPinned: false,
        isRead: false,
      })
    }
    setCaptureTitle('')
    setCaptureUrl('')
    setShowCapture(false)
  }

  return (
    <div className="page">
      <header className="page-header home-header">
        <div>
          <p className="greeting-sub">{greeting}，</p>
          <h1 className="greeting-name">{displayName}</h1>
        </div>
        <div className="header-actions">
          <button className="lang-btn" onClick={() => setLanguage(settings.language === 'zh' ? 'en' : 'zh')}>
            {settings.language === 'zh' ? 'EN' : '中'}
          </button>
          <button className="icon-btn"
            onClick={() => setTheme(settings.theme === 'light' ? 'dark' : 'light')}
            title={settings.theme === 'light' ? t('settings', 'themeDark') : t('settings', 'themeLight')}>
            {settings.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings')}><Settings size={20} /></button>
        </div>
      </header>

      {/* Global search */}
      <div className="search-bar" style={{ margin: '12px 16px' }}>
        <Search size={16} className="search-icon" />
        <input type="text" placeholder={t('home', 'searchPlaceholder')} value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
        {searchQuery && <button className="icon-btn" onClick={() => setSearchQuery('')}><X size={14} /></button>}
      </div>

      {/* Search results */}
      {searchQuery && (
        <div className="home-section">
          {searchResults.length === 0 ? (
            <p className="empty-hint">{t('common', 'noResults')}</p>
          ) : (
            <div className="search-results">
              {searchResults.map((r) => (
                <button key={r.id} className="search-result-item" onClick={() => navigate(r.route)}>
                  <span className="result-module" style={{ color: moduleColors[r.module], background: moduleColors[r.module] + '22' }}>
                    {moduleLabel[r.module]}
                  </span>
                  <div className="result-text">
                    <span className="result-title">{r.title}</span>
                    {r.subtitle && <span className="result-subtitle">{r.subtitle}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!searchQuery && (
        <>
          {/* Reminders — soonest first, with year */}
          <section className="home-section">
            <div className="section-header">
              <Bell size={14} /><h2>{t('common', 'reminders')}</h2>
              <button className="section-add-btn" onClick={() => navigate('/notes?action=add')}>
                <Plus size={13} />
              </button>
            </div>
            {reminders.length === 0 ? (
              <p className="empty-hint">{t('home', 'noReminders')}</p>
            ) : (
              <div className="reminder-list">
                {reminders.map((r) => (
                  <button key={r.id} className="reminder-item" onClick={() => navigate(r.route)}>
                    <Bell size={13} style={{ color: r.overdue ? 'var(--color-error)' : 'var(--color-primary)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <p className="reminder-item-title">{r.title}</p>
                      <p className="reminder-item-time" style={{ color: r.overdue ? 'var(--color-error)' : undefined }}>
                        {formatReminder(r.reminderAt)}
                        {r.overdue && (settings.language === 'en' ? ' · Overdue' : ' · 已逾期')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Favourites */}
          <section className="home-section">
            <div className="section-header">
              <Star size={14} /><h2>{t('common', 'favourites')}</h2>
            </div>
            {favourites.length === 0 ? (
              <p className="empty-hint">{t('home', 'noFavourites')}</p>
            ) : (
              <div className="fav-grid">
                {favourites.map((f) => (
                  <button key={f.id} className="fav-item" onClick={() => navigate(f.route)}>
                    <span className="fav-module" style={{ color: moduleColors[f.module] }}>
                      {moduleLabel[f.module]}
                    </span>
                    <span className="fav-title">{f.title}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Recently updated */}
          {recentlyUpdated.length > 0 && (
            <section className="home-section">
              <div className="section-header">
                <Bell size={14} style={{ opacity: 0 }} />
                <h2>{settings.language === 'en' ? 'Recently Updated' : '最近更新'}</h2>
              </div>
              <div className="recent-list">
                {recentlyUpdated.map((item) => (
                  <button key={item.id} className="recent-item" onClick={() => navigate(item.route)}>
                    <span className="recent-module" style={{ color: moduleColors[item.module], background: moduleColors[item.module] + '22' }}>
                      {moduleLabel[item.module]}
                    </span>
                    <span className="recent-title">{item.title}</span>
                    <span className="recent-time">{formatUpdated(item.updatedAt)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {/* F-26: Quick Capture FAB */}
      {showCapture && (
        <div style={{
          position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 200,
          background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 16,
          border: '1px solid var(--color-border)',
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => setCaptureMode('note')}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 'var(--radius-md)',
                fontWeight: 600, fontSize: 13,
                background: captureMode === 'note' ? 'var(--color-primary)' : 'var(--color-bg)',
                color: captureMode === 'note' ? '#fff' : 'var(--color-text-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              <FileText size={13} style={{ display: 'inline', marginRight: 4 }} />
              {settings.language === 'zh' ? '筆記' : 'Note'}
            </button>
            <button
              onClick={() => setCaptureMode('bookmark')}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 'var(--radius-md)',
                fontWeight: 600, fontSize: 13,
                background: captureMode === 'bookmark' ? 'var(--color-primary)' : 'var(--color-bg)',
                color: captureMode === 'bookmark' ? '#fff' : 'var(--color-text-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Link size={13} style={{ display: 'inline', marginRight: 4 }} />
              {settings.language === 'zh' ? '書籤' : 'Bookmark'}
            </button>
          </div>
          <input
            type="text"
            placeholder={settings.language === 'zh' ? '標題' : 'Title'}
            value={captureTitle}
            onChange={(e) => setCaptureTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !captureUrl && handleQuickCapture()}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', background: 'var(--color-bg)',
              color: 'var(--color-text)', fontSize: 14, boxSizing: 'border-box', marginBottom: 8,
            }}
            autoFocus
          />
          {captureMode === 'bookmark' && (
            <input
              type="url"
              placeholder="https://"
              value={captureUrl}
              onChange={(e) => setCaptureUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickCapture()}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                color: 'var(--color-text)', fontSize: 14, boxSizing: 'border-box', marginBottom: 8,
              }}
            />
          )}
          <button
            onClick={handleQuickCapture}
            disabled={!captureTitle.trim() || (captureMode === 'bookmark' && !captureUrl.trim())}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: 14,
              opacity: (!captureTitle.trim() || (captureMode === 'bookmark' && !captureUrl.trim())) ? 0.5 : 1,
            }}
          >
            {settings.language === 'zh' ? '快速儲存' : 'Save'}
          </button>
        </div>
      )}
      <button
        className="fab"
        onClick={() => setShowCapture(!showCapture)}
        aria-label={settings.language === 'zh' ? '快速新增' : 'Quick Capture'}
        style={{ zIndex: 201 }}
      >
        {showCapture ? <ChevronUp size={24} /> : <Plus size={24} />}
      </button>
    </div>
  )
}
