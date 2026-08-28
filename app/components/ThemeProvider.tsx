'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'dendi-theme'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

function subscribeToTheme(callback: () => void) {
  const syncStoredTheme = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return
    applyTheme(event.newValue === 'dark' ? 'dark' : 'light')
    callback()
  }

  window.addEventListener('storage', syncStoredTheme)
  window.addEventListener('dendi-theme-change', callback)
  return () => {
    window.removeEventListener('storage', syncStoredTheme)
    window.removeEventListener('dendi-theme-change', callback)
  }
}

function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function getThemeServerSnapshot(): Theme {
  return 'light'
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot)

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Le thème reste actif pour la session si le stockage local est indisponible.
    }
    window.dispatchEvent(new Event('dendi-theme-change'))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [setTheme, theme])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme,
  }), [setTheme, theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme doit être utilisé dans ThemeProvider')
  return context
}
