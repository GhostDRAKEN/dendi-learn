'use client'

import { useState, useEffect } from 'react'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function MotCard({ mot }: { mot: Mot }) {
  const [retournee, setRetournee] = useState(false)
  const [monte, setMonte] = useState(false)
  const [modePhon, setModePhon] = useState(false)

  useEffect(() => {
    setMonte(true)
  }, [])

  if (!monte) {
    return (
      <div style={{
        backgroundColor: '#161616',
        border: '1px solid #2A2A2A',
        borderRadius: '16px',
        padding: '32px 24px',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '18px', fontWeight: '600', color: '#F5F0EB' }}>{mot.fr}</p>
      </div>
    )
  }

  return (
    <div
      onClick={() => !retournee && setRetournee(true)}
      style={{
        backgroundColor: retournee ? '#1A0F00' : '#161616',
        border: retournee ? '1px solid #E07B39' : '1px solid #2A2A2A',
        borderRadius: '16px',
        padding: '32px 24px',
        minHeight: '160px',
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
          <p style={{ fontSize: '18px', fontWeight: '600', color: '#F5F0EB' }}>{mot.fr}</p>
          <p style={{ fontSize: '11px', marginTop: '12px', letterSpacing: '2px', color: '#555', textTransform: 'uppercase' }}>
            Toucher pour révéler
          </p>
        </>
      ) : (
        <>
          {/* Mot principal */}
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#E07B39', marginTop: '8px' }}>
            {modePhon ? mot.phonetique : mot.dendi}
          </p>

          {/* Bouton toggle intuitif */}
          <button
            onClick={(e) => { e.stopPropagation(); setModePhon(!modePhon) }}
            style={{
              marginTop: '10px',
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              padding: '0',
            }}
          >
            {modePhon ? 'Voir l\'écriture officielle' : 'Voir la prononciation'}
          </button>

          <div style={{ width: '30px', height: '1px', backgroundColor: '#333', margin: '12px auto' }} />
          <p style={{ fontSize: '13px', color: '#777' }}>{mot.fr}</p>

          {/* Bouton refermer */}
          <button
  onClick={(e) => { e.stopPropagation(); setRetournee(false); setModePhon(false) }}
  style={{
    marginTop: '12px',
    background: 'none',
    border: 'none',
    color: '#555',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }}
>
  Cacher
</button>
        </>
      )}
    </div>
  )
}