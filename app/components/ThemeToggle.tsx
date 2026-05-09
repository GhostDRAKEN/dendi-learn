'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    document.body.className = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    document.body.classList.add('dark')
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleDeconnexion = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button onClick={() => setDark(!dark)}
        style={{ padding: '8px 14px', borderRadius: '9999px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
        {dark ? '☀️ Clair' : '🌙 Sombre'}
      </button>

      {user ? (
        <button onClick={handleDeconnexion}
          style={{ padding: '8px 14px', borderRadius: '9999px', border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
          Déconnexion
        </button>
      ) : (
        <Link href="/connexion">
          <button style={{ padding: '8px 14px', borderRadius: '9999px', border: '1px solid #E07B39', backgroundColor: 'transparent', color: '#E07B39', fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            Connexion
          </button>
        </Link>
      )}
    </div>
  )
}
