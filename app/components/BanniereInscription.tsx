'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function BanniereInscription({ vusCount }: { vusCount: number }) {
  const [dismissed, setDismissed] = useState(false)
  const bannerRef = useRef<HTMLElement>(null)
  const visible = !dismissed && vusCount >= 10

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

  // Le parent rend la bannière uniquement pour les invités.
  if (!visible) return null

  return (
    <aside ref={bannerRef} className="signup-banner" aria-label="Créer un compte Dendi-Learn">
      <div>
        <p className="signup-banner-title">
          🎯 Vous avez consulté {vusCount} mots
        </p>
        <p className="signup-banner-copy">
          Avec un compte, retrouvez les mots vus et maîtrisés pendant vos sessions connectées.
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
