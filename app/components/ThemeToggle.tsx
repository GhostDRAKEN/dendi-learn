'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import SoundToggle from './SoundToggle'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const [user, setUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoaded(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleDeconnexion = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="site-account-nav" aria-label="Compte et préférences" aria-busy={!authLoaded}>
      <button
        type="button"
        className="site-nav-action site-theme-toggle"
        onClick={toggleTheme}
        aria-label={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
        aria-pressed={dark}
        title={dark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      >
        <svg className="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z" />}
        </svg>
        <span className="theme-toggle-label">{dark ? 'Clair' : 'Sombre'}</span>
      </button>

      <SoundToggle />

      {!authLoaded ? (
        <span className="site-auth-placeholder" aria-hidden="true" />
      ) : user ? (
        <div className="site-user-actions">
          <Link href="/profil" className="site-nav-action site-profile-link">
            Profil
          </Link>
          <button type="button" onClick={handleDeconnexion} className="site-nav-action site-logout-button">
            Déconnexion
          </button>
        </div>
      ) : (
        <div className="site-user-actions">
          <Link href="/connexion" className="site-nav-action site-login-link">
            Connexion
          </Link>
          <Link href="/inscription" className="site-nav-action site-signup-link">
            Inscription
          </Link>
        </div>
      )}
    </nav>
  )
}
