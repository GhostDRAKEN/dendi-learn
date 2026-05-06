'use client'
import { useState, useEffect } from 'react'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function MotCard({ mot, onVue }: { mot: Mot; onVue?: () => void }) {
  const [retournee, setRetournee] = useState(false)
  const [monte, setMonte] = useState(false)

  useEffect(() => {
    setMonte(true)
  }, [])

  const handleClick = () => {
    if (!retournee) {
      setRetournee(true)
      onVue?.()
    } else {
      setRetournee(false)
    }
  }

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
      onClick={handleClick}
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
        cursor: 'pointer',
        transition: 'all 0.3s ease',
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
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#E07B39' }}>{mot.dendi}</p>
          <p style={{ fontSize: '14px', marginTop: '8px', fontStyle: 'italic', color: '#A89A8A' }}>{mot.phonetique}</p>
          <div style={{ width: '30px', height: '1px', backgroundColor: '#333', margin: '12px auto' }} />
          <p style={{ fontSize: '13px', color: '#777' }}>{mot.fr}</p>
        </>
      )}
    </div>
  )
}
