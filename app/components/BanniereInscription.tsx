'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function BanniereInscription({ vusCount }: { vusCount: number }) {
  const [user, setUser] = useState<User | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const bannerRef = useRef<HTMLElement>(null)
  const visible = loaded && !user && !dismissed && vusCount >= 10

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    const banner = bannerRef.current
    if (!visible || !banner) return
    const root = document.documentElement
    const measure = () => root.style.setProperty('--signup-banner-height', `${banner.getBoundingClientRect().height}px`)
    const observer = new ResizeObserver(measure)
    observer.observe(banner, { box: 'border-box' })
    measure()
    return () => {
      observer.disconnect()
      root.style.removeProperty('--signup-banner-height')
    }
  }, [visible])

  // Afficher seulement si : pas connecté, 10+ mots vus, pas fermé
  if (!visible) return null

  return (
    <aside ref={bannerRef} className="signup-banner" aria-label="Sauvegarder votre progression">
      <div>
        <p className="signup-banner-title">
          🎯 Tu progresses bien !
        </p>
        <p className="signup-banner-copy">
          Crée un compte gratuit pour sauvegarder tes {vusCount} mots appris.
        </p>
      </div>
      <div className="signup-banner-actions">
        <button type="button" onClick={() => setDismissed(true)} className="signup-banner-dismiss">
          Plus tard
        </button>
        <Link href="/inscription" className="signup-banner-action">
          S&apos;inscrire
        </Link>
      </div>
    </aside>
  )
}
