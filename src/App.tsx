import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useAppStore } from './stores/appStore'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import RecipesPage from './pages/RecipesPage'
import BookmarksPage from './pages/BookmarksPage'
import PasswordsPage from './pages/PasswordsPage'
import NotesPage from './pages/NotesPage'
import SettingsPage from './pages/SettingsPage'
import CountdownPage from './pages/CountdownPage'
import PasswordHealthPage from './pages/PasswordHealthPage'
import BottomNav from './components/BottomNav'

function AuthenticatedApp() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/passwords" element={<PasswordsPage />} />
          <Route path="/passwords/health" element={<PasswordHealthPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/countdown" element={<CountdownPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

function AppRouter() {
  const { user, settings } = useAppStore()
  useAuth()

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  if (user === undefined) {
    return <div className="loading-screen"><p>Loading...</p></div>
  }

  return user ? <AuthenticatedApp /> : <LoginPage />
}

export default function App() {
  const basename = import.meta.env.VITE_BASE_PATH || '/'
  return (
    <BrowserRouter basename={basename}>
      <AppRouter />
    </BrowserRouter>
  )
}
