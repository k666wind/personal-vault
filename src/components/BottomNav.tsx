import { NavLink } from 'react-router-dom'
import { Home, BookOpen, Bookmark, Lock, FileText } from 'lucide-react'
import { useAppStore } from '../stores/appStore'

export default function BottomNav() {
  const { t } = useAppStore()

  const tabs = [
    { to: '/', icon: Home, label: t('nav', 'home'), end: true },
    { to: '/recipes', icon: BookOpen, label: t('nav', 'recipes') },
    { to: '/bookmarks', icon: Bookmark, label: t('nav', 'bookmarks') },
    { to: '/passwords', icon: Lock, label: t('nav', 'passwords') },
    { to: '/notes', icon: FileText, label: t('nav', 'notes') },
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
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
