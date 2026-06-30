import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, Bell, Settings, X, Sun, Moon, Plus, Link, FileText, ChevronUp, Pin } from 'lucide-react'
import NotificationInbox from '../components/NotificationInbox'
import { getUnreadNotificationCount } from '../lib/notifications'
import { highlightText } from '../lib/highlight'
import { useAppStore } from '../stores/appStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useNoteStore } from '../stores/noteStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useCountdownStore } from '../stores/countdownStore'
import { usePasswordStore } from '../stores/passwordStore'

export default function HomePage() {
  const { t, user, settings, setLanguage, setTheme, dashboardSections } = useAppStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCapture, setShowCapture] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const [unreadNotifCount, setUnreadNotifCount] = useState(() => getUnreadNotificationCount())
  const [captureTitle, setCaptureTitle] = useState('')
  const [captureUrl, setCaptureUrl] = useState('')
  const [captureMode, setCaptureMode] = useState<'note' | 'bookmark'>('note')

  const { bookmarks, init: initBm, teardown: tearBm, add: addBookmark } = useBookmarkStore()

  const { notes, init: initNt, teardown: tearNt, add: addNote } = useNoteStore()
  const { recipes, init: initRc, teardown: tearRc } = useRecipeStore()
  const { items: countdowns, subscribe: subCd, cleanup: cleanCd } = useCountdownStore()
  const { entries: passwords, init: initPw, teardown: tearPw } = usePasswordStore()

  useEffect(() => {
    if (!user) return
    initBm(user.uid)
    initNt(user.uid)
    initRc(user.uid)
    subCd(user.uid)
    initPw(user.uid)
    return () => { tearBm(); tearNt(); tearRc(); cleanCd(); tearPw() }
  }, [user?.uid])

  const refreshUnread = useCallback(() => setUnreadNotifCount(getUnreadNotificationCount()), [])

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
    // BUG-S6-05 FIX: include passwords in global search (search site + username + tags only, not encrypted content)
    passwords.forEach((p) => {
      if (p.site.toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || p.tags.some(tg => tg.includes(q)))
        results.push({ id: p.id, module: 'password', title: p.site, subtitle: p.username, route: '/passwords' })
    })
    return results.slice(0, 10)
  }, [searchQuery, bookmarks, notes, recipes, countdowns, passwords, locale])

  // ── Favourites ─────────────────────────────────────────
  const favourites = useMemo(() => {
    const result: Array<{ id: string; module: string; title: string; route: string }> = []
    bookmarks.filter(b => b.isFavourite).forEach(b => result.push({ id: b.id, module: 'bookmark', title: b.title, route: '/bookmarks' }))
    notes.filter(n => n.isFavourite).forEach(n => result.push({ id: n.id, module: 'note', title: n.title, route: '/notes' }))
    recipes.filter(r => r.isFavourite).forEach(r => result.push({ id: r.id, module: 'recipe', title: r.title, route: '/recipes' }))
    countdowns.filter(c => c.isFavourite).forEach(c => result.push({ id: c.id, module: 'countdown', title: c.title, route: '/countdown' }))
    passwords.filter(p => p.isFavourite).forEach(p => result.push({ id: p.id, module: 'password', title: p.site, route: '/passwords' }))
    return result.slice(0, 6)
  }, [bookmarks, notes, recipes, countdowns, passwords])

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
    passwords.forEach(p => all.push({ id: p.id, module: 'password', title: p.site, updatedAt: p.updatedAt, route: '/passwords' }))
    return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)
  }, [bookmarks, notes, recipes, countdowns, passwords])

  // S6-H: Compute next occurrence for recurring countdowns
  const getNextOccurrence = (c: typeof countdowns[0]): number => {
    if (!c.recurrence) return c.targetDate
    const today = new Date(); today.setHours(0,0,0,0)
    const base = new Date(c.targetDate)
    if (c.recurrence === 'yearly') {
      const next = new Date(base)
      next.setFullYear(today.getFullYear())
      if (next < today) next.setFullYear(today.getFullYear() + 1)
      return next.getTime()
    }
    if (c.recurrence === 'monthly') {
      const next = new Date(base)
      next.setFullYear(today.getFullYear()); next.setMonth(today.getMonth())
      if (next < today) next.setMonth(next.getMonth() + 1)
      return next.getTime()
    }
    return c.targetDate
  }

  // Pinned countdowns — sorted upcoming first, past last
  const pinnedCountdowns = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()
    const pinned = countdowns.filter(c => c.isPinned)
    // S6-H: use next occurrence for recurring
    const withNext = pinned.map(c => ({ c, next: getNextOccurrence(c) }))
    const upcoming = withNext.filter(x => x.next >= todayMs).sort((a, b) => a.next - b.next).map(x => x.c)
    const past = withNext.filter(x => x.next < todayMs).sort((a, b) => b.next - a.next).map(x => x.c)
    return [...upcoming, ...past].slice(0, 5)
  }, [countdowns])

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

  const formatCountdownDiff = (targetMs: number) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const diff = Math.round((targetMs - today.getTime()) / 86400000)
    if (diff === 0) return settings.language === 'en' ? 'Today' : '今日'
    if (diff > 0) return settings.language === 'en' ? `${diff}d left` : `還有 ${diff} 日`
    return settings.language === 'en' ? `${Math.abs(diff)}d ago` : `已過 ${Math.abs(diff)} 日`
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
          <button className="icon-btn" style={{ position: 'relative' }} onClick={() => setShowInbox(true)}>
            <Bell size={20} />
            {unreadNotifCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2, width: 8, height: 8,
                background: 'var(--color-danger)', borderRadius: '50%',
              }} />
            )}
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
                    <span className="result-title" dangerouslySetInnerHTML={{ __html: highlightText(r.title, searchQuery) }} />
                    {r.subtitle && <span className="result-subtitle" dangerouslySetInnerHTML={{ __html: highlightText(r.subtitle, searchQuery) }} />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!searchQuery && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* S6-I: sections rendered in user-defined order */}
          {/* Reminders — soonest first, with year */}
          <section className="home-section" style={{ order: dashboardSections.indexOf('reminders') >= 0 ? dashboardSections.indexOf('reminders') : 99, display: dashboardSections.includes('reminders') ? undefined : 'none' }}>
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

          {/* Pinned Countdowns */}
          <section className="home-section" style={{ order: dashboardSections.indexOf('pinned') >= 0 ? dashboardSections.indexOf('pinned') : 99, display: pinnedCountdowns.length === 0 || !dashboardSections.includes('pinned') ? 'none' : undefined }}>
              <div className="section-header">
                <Pin size={14} style={{ color: 'var(--color-primary)' }} />
                <h2>{settings.language === 'zh' ? '置頂日子' : 'Pinned Dates'}</h2>
                <button className="section-add-btn" onClick={() => navigate('/countdown')}>
                  <Plus size={13} />
                </button>
              </div>
              <div className="reminder-list">
                {pinnedCountdowns.map((c) => {
                  const today = new Date(); today.setHours(0, 0, 0, 0)
                  const isPast = c.targetDate < today.getTime()
                  const isToday = c.targetDate === today.getTime()
                  return (
                    <button key={c.id} className="reminder-item" onClick={() => navigate('/countdown')}>
                      <Pin size={13} style={{ color: isPast ? 'var(--color-text-3)' : 'var(--color-primary)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <p className="reminder-item-title">{c.title}</p>
                        <p className="reminder-item-time" style={{ color: isToday ? 'var(--color-success)' : isPast ? 'var(--color-text-3)' : 'var(--color-primary)' }}>
                          {new Date(getNextOccurrence(c)).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' · '}{formatCountdownDiff(getNextOccurrence(c))}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
          </section>

          {/* Favourites */}
          <section className="home-section" style={{ order: dashboardSections.indexOf('favourites') >= 0 ? dashboardSections.indexOf('favourites') : 99, display: dashboardSections.includes('favourites') ? undefined : 'none' }}>
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
          <section className="home-section" style={{ order: dashboardSections.indexOf('recent') >= 0 ? dashboardSections.indexOf('recent') : 99, display: recentlyUpdated.length === 0 || !dashboardSections.includes('recent') ? 'none' : undefined }}>
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
        </div>
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

      {/* S6-D: Notification Inbox */}
      {showInbox && (
        <NotificationInbox onClose={() => { setShowInbox(false); refreshUnread() }} />
      )}
    </div>
  )
}
