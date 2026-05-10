'use client'
import { useState, useEffect } from 'react'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function MotCard({ mot, onVue, dejaVu }: { mot: Mot, onVue?: () => void, dejaVu?: boolean }) {
  const [retournee, setRetournee] = useState(false)
  const [monte, setMonte] = useState(false)
  const [modePhon, setModePhon] = useState(false)

  useEffect(() => {
    setMonte(true)
  }, [])

  if (!monte) {
    return (
      <div style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px 16px',
        minHeight: '130px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>{mot.fr}</p>
      </div>
    )
  }

  return (
    <div
      onClick={() => {
        if (!retournee) {
          setRetournee(true)
          onVue?.()
        }
      }}
      style={{
        backgroundColor: retournee ? '#1A0F00' : 'var(--card)',
        border: retournee ? '1px solid #E07B39' : dejaVu ? '1px solid rgba(224, 123, 57, 0.35)' : '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px 16px',
        minHeight: '130px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        cursor: retournee ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      {!retournee ? (
        <>
          <p style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>{mot.fr}</p>
          <p style={{ fontSize: '11px', marginTop: '12px', letterSpacing: '2px', color: dejaVu ? '#E07B39' : 'var(--text-muted)', textTransform: 'uppercase' }}>
            {dejaVu ? '✓ Déjà vu' : 'Toucher pour révéler'}
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: '20px', fontWeight: '700', color: '#E07B39', marginTop: '8px' }}>
            {modePhon ? mot.phonetique : mot.dendi}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); setModePhon(!modePhon) }}
            style={{ marginTop: '8px', background: 'none', border: 'none', color: '#666', fontSize: '11px', cursor: 'pointer', fontFamily: 'Georgia, serif', textDecoration: 'underline', textUnderlineOffset: '3px', padding: '0' }}
          >
            {modePhon ? 'Voir l\'écriture officielle' : 'Voir la prononciation'}
          </button>
          <div style={{ width: '30px', height: '1px', backgroundColor: 'var(--border)', margin: '10px auto' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{mot.fr}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setRetournee(false); setModePhon(false) }}
            style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '10px', cursor: 'pointer', fontFamily: 'Georgia, serif', letterSpacing: '1px', textTransform: 'uppercase' }}
          >
            Cacher
          </button>
        </>
      )}
    </div>
  )
}