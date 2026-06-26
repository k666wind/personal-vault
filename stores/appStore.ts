import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language, Theme, User, AppSettings } from '../types'
import { translations } from '../i18n/translations'

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
      user: undefined as UserState,
      setUser: (user) => set({ user }),

      settings: {
        language: 'zh',
        theme: 'system',   // F-18: default to system preference
        claudeApiKey: '',
        passwordLockTimeout: 5,
      },

      setLanguage: (lang) => set((s) => ({ settings: { ...s.settings, language: lang } })),
      // F-18: theme can now be 'light' | 'dark' | 'system'
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setClaudeApiKey: (key) => set((s) => ({ settings: { ...s.settings, claudeApiKey: key } })),
      setLockTimeout: (minutes) => set((s) => ({ settings: { ...s.settings, passwordLockTimeout: minutes } })),

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
      partialize: (s) => ({ settings: s.settings, recentItems: s.recentItems }),
      onRehydrateStorage: () => (state) => {
        if (state) state.user = undefined
      },
    }
  )
)
