import { useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

// F-18: Applies the correct data-theme attribute to <html> based on:
//   - 'light' / 'dark'  → use directly
//   - 'system'          → follow prefers-color-scheme media query
// Also listens for OS-level changes in real time when theme='system'.
export function useSystemTheme() {
  const { settings } = useAppStore()

  useEffect(() => {
    const applyTheme = (prefersDark: boolean) => {
      let resolved: 'light' | 'dark'
      if (settings.theme === 'system') {
        resolved = prefersDark ? 'dark' : 'light'
      } else {
        resolved = settings.theme as 'light' | 'dark'
      }
      document.documentElement.setAttribute('data-theme', resolved)
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    applyTheme(mq.matches)

    // Only listen for OS changes when theme is 'system'
    if (settings.theme === 'system') {
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [settings.theme])
}
