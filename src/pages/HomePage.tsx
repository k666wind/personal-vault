import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, Clock, Bell, Settings, LogOut, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'
import { useBookmarkStore } from '../stores/bookmarkStore'
import { useNoteStore } from '../stores/noteStore'
import { useRecipeStore } from '../stores/recipeStore'

export default function HomePage() {
  const { t, user, recentItems, settings, setLanguage } = useAppStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const { bookmarks, init: initBm, teardown: tearBm } = useBookmarkStore()
  const { notes, init: initNt, teardown: tearNt } = useNoteStore()
  const { recipes, init: initRc, teardown: tearRc } = useRecipeStore()

  useEffect(() => {
    if (!user) return
    initBm(user.uid)
    initNt(user.uid)
    initRc(user.uid)
    return () => { tearBm(); tearNt(); tearRc() }
  }, [user?.uid])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('home', 'goodMorning') : hour < 18 ? t('home', 'goodAfternoon') : t('home', 'goodEvening')
  const displayName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || ''

  // Global search across all modules
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const results: Array<{ id: string; module: string; title: string; subtitle: string; route: string }> = []

    bookmarks.forEach((b) => {
      if (b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q) || b.tags.some(t => t.includes(q))) {
        results.push({ id: b.id, module: '網址', title: b.title, subtitle: b.url, route: '/bookmarks' })
      }
    })
    notes.forEach((n) => {
      if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.includes(q))) {
        results.push({ id: n.id, module: '筆記', title: n.title, subtitle: n.content.slice(0, 60), route: '/notes' })
      }
    })
    recipes.forEach((r) => {
      if (r.title.toLowerCase().includes(q) || r.tags.some(t => t.includes(q)) || r.ingredients.some(i => i.name.toLowerCase().includes(q))) {
        results.push({ id: r.id, module: '食譜', title: r.title, subtitle: r.description || `${r.ingredients.length} 種食材`, route: '/recipes' })
      }
    })
    return results.slice(0, 10)
  }, [searchQuery, bookmarks, notes, recipes])

  // Favourites across all modules
  const favourites = useMemo(() => {
    const result: Array<{ id: string; module: string; title: string; route: string }> = []
    bookmarks.filter(b => b.isFavourite).forEach(b => result.push({ id: b.id, module: '網址', title: b.title, route: '/bookmarks' }))
    notes.filter(n => n.isFavourite).forEach(n => result.push({ id: n.id, module: '筆記', title: n.title, route: '/notes' }))
    recipes.filter(r => r.isFavourite).forEach(r => result.push({ id: r.id, module: '食譜', title: r.title, route: '/recipes' }))
    return result.slice(0, 6)
  }, [bookmarks, notes, recipes])

  // Upcoming reminders from notes
  const reminders = useMemo(() => {
    return notes
      .filter(n => n.reminderAt && n.reminderAt > Date.now() - 24 * 60 * 60 * 1000)
      .sort((a, b) => (a.reminderAt || 0) - (b.reminderAt || 0))
      .slice(0, 3)
  }, [notes])

  const moduleRoutes: Record<string, string> = {
    recipe: '/recipes', bookmark: '/bookmarks', password: '/passwords', note: '/notes',
  }

  const moduleColors: Record<string, string> = {
    '食譜': 'var(--color-recipe)', '網址': 'var(--color-bookmark)',
    '筆記': 'var(--color-note)', '密碼': 'var(--color-password)',
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
          <button className="icon-btn" onClick={() => navigate('/settings')}><Settings size={20} /></button>
          <button className="icon-btn" onClick={signOut}><LogOut size={20} /></button>
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
                  <span className="result-module" style={{ color: moduleColors[r.module], background: moduleColors[r.module] + '18' }}>
                    {r.module}
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
                {reminders.map((n) => (
                  <button key={n.id} className="reminder-item" onClick={() => navigate('/notes')}>
                    <Bell size={13} />
                    <div>
                      <p className="reminder-item-title">{n.title}</p>
                      <p className="reminder-item-time">
                        {new Date(n.reminderAt!).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                    <span className="fav-module" style={{ color: moduleColors[f.module] }}>{f.module}</span>
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
                    <span className="recent-module">{item.moduleType}</span>
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
