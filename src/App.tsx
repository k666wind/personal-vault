import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useSystemTheme } from './hooks/useSystemTheme'
import { useReminderChecker } from './hooks/useReminderChecker'
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
import ShoppingListPage from './pages/ShoppingListPage'
import TagManagerPage from './pages/TagManagerPage'
import SharedRecipePage from './pages/SharedRecipePage'
import MealPlannerPage from './pages/MealPlannerPage'
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
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="/tags" element={<TagManagerPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/countdown" element={<CountdownPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/meal-planner" element={<MealPlannerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

// BUG-04 FIX: Use useLocation() inside the Router context instead of
// window.location.pathname. This correctly respects the basename and avoids
// brittle string matching against the raw window pathname.
function AppRouter() {
  const { user } = useAppStore()
  const location = useLocation()
  useAuth()

  // F-18: apply theme (including system preference tracking)
  useSystemTheme()
  // F-07: check reminders every 60s while app is open
  useReminderChecker()

  // BUG-01 FIX: user===undefined means Firebase Auth hasn't resolved yet
  if (user === undefined) {
    return <div className="loading-screen"><p>Loading...</p></div>
  }

  // Public shared recipe page — accessible without login
  // Check the router-aware pathname (strips basename automatically)
  if (!user && location.pathname.startsWith('/shared/recipe/')) {
    return (
      <Routes>
        <Route path="/shared/recipe/:id" element={<SharedRecipePage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  if (user) return <AuthenticatedApp />
  return <LoginPage />
}

export default function App() {
  const basename = import.meta.env.VITE_BASE_PATH || '/'
  return (
    <BrowserRouter basename={basename}>
      <AppRouter />
    </BrowserRouter>
  )
}
