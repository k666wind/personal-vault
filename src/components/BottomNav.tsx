import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Bookmark, Lock, CalendarDays, FileText } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

export default function BottomNav() {
  const { t } = useAppStore()

  const tabs = [
    { to: '/', icon: Home, label: t('nav', 'home'), end: true },
    { to: '/notes', icon: FileText, label: t('nav', 'notes') },
    { to: '/bookmarks', icon: Bookmark, label: t('nav', 'bookmarks') },
    { to: '/recipes', icon: BookOpen, label: t('nav', 'recipes') },
    { to: '/passwords', icon: Lock, label: t('nav', 'passwords') },
    { to: '/countdown', icon: CalendarDays, label: t('nav', 'countdown') },
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
        >
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
