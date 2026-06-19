import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, Clock, Bell, Settings, LogOut } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { useAuth } from '../hooks/useAuth'

export default function HomePage() {
  const { t, user, recentItems, settings, setLanguage } = useAppStore()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? t('home', 'goodMorning') :
    hour < 18 ? t('home', 'goodAfternoon') :
    t('home', 'goodEvening')

  const displayName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || ''

  const moduleRoutes: Record<string, string> = {
    recipe: '/recipes',
    bookmark: '/bookmarks',
    password: '/passwords',
    note: '/notes',
  }

  return (
    <div className="page">
      {/* Header */}
      <header className="page-header home-header">
        <div>
          <p className="greeting-sub">{greeting}，</p>
          <h1 className="greeting-name">{displayName}</h1>
        </div>
        <div className="header-actions">
          <button
            className="lang-btn"
            onClick={() => setLanguage(settings.language === 'zh' ? 'en' : 'zh')}
          >
            {settings.language === 'zh' ? 'EN' : '中'}
          </button>
          <button className="icon-btn" onClick={() => navigate('/settings')}>
            <Settings size={20} />
          </button>
          <button className="icon-btn" onClick={signOut}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Search bar */}
      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder={t('home', 'searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Reminders */}
      <section className="home-section">
        <div className="section-header">
          <Bell size={16} />
          <h2>{t('common', 'reminders')}</h2>
        </div>
        <p className="empty-hint">{t('home', 'noReminders')}</p>
      </section>

      {/* Favourites */}
      <section className="home-section">
        <div className="section-header">
          <Star size={16} />
          <h2>{t('common', 'favourites')}</h2>
        </div>
        <p className="empty-hint">{t('home', 'noFavourites')}</p>
      </section>

      {/* Recently viewed */}
      <section className="home-section">
        <div className="section-header">
          <Clock size={16} />
          <h2>{t('common', 'recentlyViewed')}</h2>
        </div>
        {recentItems.length === 0 ? (
          <p className="empty-hint">{t('home', 'noRecentItems')}</p>
        ) : (
          <div className="recent-list">
            {recentItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                className="recent-item"
                onClick={() => navigate(moduleRoutes[item.moduleType] || '/')}
              >
                <span className="recent-module">{item.moduleType}</span>
                <span className="recent-title">{item.title}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
