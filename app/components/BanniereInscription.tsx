'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function BanniereInscription({ vusCount }: { vusCount: number }) {
  const [user, setUser] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoaded(true)
    })
  }, [])

  // Afficher seulement si : pas connecté, 10+ mots vus, pas fermé
  if (!loaded || user || dismissed || vusCount < 10) return null

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%',
      transform: 'translateX(-50%)',
      width: '90%', maxWidth: '500px',
      backgroundColor: '#1A0F00',
      border: '1px solid #E07B39',
      borderRadius: '16px',
      padding: '20px 24px',
      zIndex: 50,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
    }}>
      <div>
        <p style={{ color: '#F5F0EB', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
          🎯 Tu progresses bien !
        </p>
        <p style={{ color: '#A89A8A', fontSize: '13px' }}>
          Crée un compte gratuit pour sauvegarder tes {vusCount} mots appris.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => setDismissed(true)}
          style={{ padding: '8px 12px', borderRadius: '9999px', border: '1px solid #3A3A3A', backgroundColor: 'transparent', color: '#A89A8A', fontSize: '12px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
          Plus tard
        </button>
        <Link href="/inscription">
          <button style={{ padding: '8px 16px', borderRadius: '9999px', border: 'none', backgroundColor: '#E07B39', color: 'white', fontSize: '12px', cursor: 'pointer', fontWeight: '600', fontFamily: 'Georgia, serif' }}>
            S'inscrire
          </button>
        </Link>
      </div>
    </div>
  )
}
