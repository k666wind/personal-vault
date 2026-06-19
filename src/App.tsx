import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAppStore } from './stores/appStore'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import RecipesPage from './pages/RecipesPage'
import BookmarksPage from './pages/BookmarksPage'
import PasswordsPage from './pages/PasswordsPage'
import NotesPage from './pages/NotesPage'
import SettingsPage from './pages/SettingsPage'
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
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

function AppRouter() {
  const { user } = useAppStore()
  useAuth() // sets up Firebase auth listener

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
