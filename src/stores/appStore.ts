import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language, Theme, User, AppSettings } from '../types'
import { translations } from '../i18n/translations'

// Use undefined as the "loading" sentinel so App.tsx can show a loading screen
// before Firebase Auth resolves. null = confirmed logged out.
type UserState = User | null | undefined

interface AppStore {
  user: UserState
  setUser: (user: User | null) => void

  settings: AppSettings
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
  setClaudeApiKey: (key: string) => void
  setLockTimeout: (minutes: number) => void

  t: (section: string, key: string) => string

  recentItems: Array<{ id: string; moduleType: string; title: string; viewedAt: number }>
  addRecentItem: (item: { id: string; moduleType: string; title: string }) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // undefined = auth not yet resolved (loading state)
      user: undefined as UserState,
      setUser: (user) => set({ user }),

      settings: {
        language: 'zh',
        theme: 'light',
        claudeApiKey: '',
        passwordLockTimeout: 5,
      },

      setLanguage: (lang) =>
        set((s) => ({ settings: { ...s.settings, language: lang } })),

      setTheme: (theme) =>
        set((s) => ({ settings: { ...s.settings, theme } })),

      setClaudeApiKey: (key) =>
        set((s) => ({ settings: { ...s.settings, claudeApiKey: key } })),

      setLockTimeout: (minutes) =>
        set((s) => ({ settings: { ...s.settings, passwordLockTimeout: minutes } })),

      t: (section: string, key: string) => {
        const lang = get().settings.language
        const dict = translations[lang] as Record<string, Record<string, string>>
        return dict?.[section]?.[key] ?? key
      },

      recentItems: [],
      addRecentItem: (item) =>
        set((s) => {
          const filtered = s.recentItems.filter((r) => r.id !== item.id)
          const updated = [{ ...item, viewedAt: Date.now() }, ...filtered].slice(0, 10)
          return { recentItems: updated }
        }),
    }),
    {
      name: 'vault-app-store',
      // Do NOT persist user — Firebase Auth restores it on reload.
      // Persisting user caused the bug where user was never undefined,
      // so the loading screen was never shown.
      partialize: (s) => ({ settings: s.settings, recentItems: s.recentItems }),
      // After rehydration, ensure user stays undefined until Firebase resolves
      onRehydrateStorage: () => (state) => {
        if (state) state.user = undefined
      },
    }
  )
)
