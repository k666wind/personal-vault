import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, Clock, Bell, Settings, X, Sun, Moon } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useNoteStore } from '../stores/noteStore'
import { useRecipeStore } from '../stores/recipeStore'
import { useCountdownStore } from '../stores/countdownStore'

export default function HomePage() {
  const { t, user, recentItems, settings, setLanguage, setTheme } = useAppStore()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const { bookmarks, init: initBm, teardown: tearBm } = useBookmarkStore()
  const { notes, init: initNt, teardown: tearNt } = useNoteStore()
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

  // Module labels via i18n
  const moduleLabel = {
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

  const moduleRoutes: Record<string, string> = {
    recipe: '/recipes', bookmark: '/bookmarks',
    password: '/passwords', note: '/notes', countdown: '/countdown',
  }

  // Global search across all modules
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
      if (r.title.toLowerCase().includes(q) || r.tags.some(tg => tg.includes(q)) || r.ingredients.some(i => i.name.toLowerCase().includes(q)))
        results.push({ id: r.id, module: 'recipe', title: r.title, subtitle: r.description || '', route: '/recipes' })
    })
    countdowns.forEach((c) => {
      if (c.title.toLowerCase().includes(q) || (c.notes || '').toLowerCase().includes(q) || c.tags.some(tg => tg.includes(q)))
        results.push({ id: c.id, module: 'countdown', title: c.title, subtitle: new Date(c.targetDate).toLocaleDateString(locale), route: '/countdown' })
    })
    return results.slice(0, 10)
  }, [searchQuery, bookmarks, notes, recipes, countdowns, locale])

  // Favourites across all modules
  const favourites = useMemo(() => {
    const result: Array<{ id: string; module: string; title: string; route: string }> = []
    bookmarks.filter(b => b.isFavourite).forEach(b => result.push({ id: b.id, module: 'bookmark', title: b.title, route: '/bookmarks' }))
    notes.filter(n => n.isFavourite).forEach(n => result.push({ id: n.id, module: 'note', title: n.title, route: '/notes' }))
    recipes.filter(r => r.isFavourite).forEach(r => result.push({ id: r.id, module: 'recipe', title: r.title, route: '/recipes' }))
    countdowns.filter(c => c.isFavourite).forEach(c => result.push({ id: c.id, module: 'countdown', title: c.title, route: '/countdown' }))
    return result.slice(0, 6)
  }, [bookmarks, notes, recipes, countdowns])

  // Upcoming reminders from notes + countdowns
  const reminders = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const fromNotes = notes
      .filter(n => n.reminderAt && n.reminderAt > cutoff)
      .map(n => ({ id: n.id, title: n.title, reminderAt: n.reminderAt!, route: '/notes' }))
    const fromCountdowns = countdowns
      .filter(c => c.reminderAt && c.reminderAt > cutoff)
      .map(c => ({ id: c.id, title: c.title, reminderAt: c.reminderAt!, route: '/countdown' }))
    return [...fromNotes, ...fromCountdowns]
      .sort((a, b) => a.reminderAt - b.reminderAt)
      .slice(0, 4)
  }, [notes, countdowns])

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
          <button className="icon-btn" onClick={() => setTheme(settings.theme === 'light' ? 'dark' : 'light')}
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
                    {moduleLabel[r.module as keyof typeof moduleLabel]}
                  </span>
                  <div className="result-text">
                    <span className="result-title">{r.title}</span>
                    <span className="result-subtitle">{r.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!searchQuery && (
        <>
          {/* Reminders */}
          <section className="home-section">
            <div className="section-header">
              <Bell size={14} /><h2>{t('common', 'reminders')}</h2>
            </div>
            {reminders.length === 0 ? (
              <p className="empty-hint">{t('home', 'noReminders')}</p>
            ) : (
              <div className="reminder-list">
                {reminders.map((r) => (
                  <button key={r.id} className="reminder-item" onClick={() => navigate(r.route)}>
                    <Bell size={13} />
                    <div>
                      <p className="reminder-item-title">{r.title}</p>
                      <p className="reminder-item-time">
                        {new Date(r.reminderAt).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                      {moduleLabel[f.module as keyof typeof moduleLabel]}
                    </span>
                    <span className="fav-title">{f.title}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Recently viewed */}
          <section className="home-section">
            <div className="section-header">
              <Clock size={14} /><h2>{t('common', 'recentlyViewed')}</h2>
            </div>
            {recentItems.length === 0 ? (
              <p className="empty-hint">{t('home', 'noRecentItems')}</p>
            ) : (
              <div className="recent-list">
                {recentItems.slice(0, 5).map((item) => (
                  <button key={item.id} className="recent-item" onClick={() => navigate(moduleRoutes[item.moduleType] || '/')}>
                    <span className="recent-module" style={{ color: moduleColors[item.moduleType], background: moduleColors[item.moduleType] + '22' }}>
                      {moduleLabel[item.moduleType as keyof typeof moduleLabel] || item.moduleType}
                    </span>
                    <span className="recent-title">{item.title}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
