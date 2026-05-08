'use client'

import { useState } from 'react'
import Filtre from './Filtre'
import QuizWrapper from './QuizWrapper'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function ThemeWrapper({ mots }: { mots: Mot[] }) {
  const [dark, setDark] = useState(true)

  const bg = dark ? '#0A0A0A' : '#F5F0EB'
  const text = dark ? '#F5F0EB' : '#1A1A1A'
  const border = dark ? '#2A2A2A' : '#D0C4B8'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, transition: 'all 0.3s ease' }}>
      <header style={{ padding: '24px 5vw 20px', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: text, margin: 0 }}>
            Dendi Learn{' '}
            <span style={{ fontSize: '13px', color: '#E07B39', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Langue du nord Bénin
            </span>
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Toggle Dark/Light */}
            <button
              onClick={() => setDark(!dark)}
              style={{
                padding: '8px 14px',
                borderRadius: '9999px',
                border: `1px solid ${border}`,
                backgroundColor: 'transparent',
                color: text,
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {dark ? '☀️ Clair' : '🌙 Sombre'}
            </button>
            <QuizWrapper mots={mots} />
          </div>
        </div>
      </header>
      <section style={{ padding: '24px 5vw' }}>
        <Filtre mots={mots} dark={dark} />
      </section>
    </div>
  )
}