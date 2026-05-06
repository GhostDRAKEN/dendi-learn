'use client'
import { useState } from 'react'
import MotCard from './MotCard'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

const TEMPS_SOUS_CATEGORIES = ['temps__journee', 'temps__repere', 'temps__semaine', 'temps__mois']

const CATEGORIES_ORDER = [
  'Tous', 'Salutations', 'temps', 'corps', 'verbes', 'prepositions', 'noms',
]

const CATEGORIES_LABELS: Record<string, string> = {
  'Tous': 'Tous',
  'Salutations': 'Salutations',
  'temps': 'Temps',
  'temps__journee': 'Journée',
  'temps__repere': 'Repères',
  'temps__semaine': 'Semaine',
  'temps__mois': 'Mois',
  'corps': 'Corps humain',
  'verbes': 'Verbes',
  'prepositions': 'Prépositions',
  'noms': 'Noms & Adjectifs',
}

export default function Filtre({ mots }: { mots: Mot[] }) {
  const [active, setActive] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showTempsMenu, setShowTempsMenu] = useState(false)

  const isTempsActive = TEMPS_SOUS_CATEGORIES.includes(active)

  const suggestions = recherche.length >= 2
    ? mots.filter((m) =>
        m.fr.toLowerCase().includes(recherche.toLowerCase()) ||
        m.dendi.toLowerCase().includes(recherche.toLowerCase())
      ).slice(0, 5)
    : []

  const motsFiltres = mots
    .filter((m) => {
      if (active === 'Tous') return true
      if (active === 'temps') return TEMPS_SOUS_CATEGORIES.includes(m.categorie)
      return m.categorie === active
    })
    .filter((m) =>
      recherche === '' ||
      m.fr.toLowerCase().includes(recherche.toLowerCase()) ||
      m.dendi.toLowerCase().includes(recherche.toLowerCase()) ||
      m.phonetique.toLowerCase().includes(recherche.toLowerCase())
    )

  const countForCat = (cat: string) => {
    if (cat === 'temps') return mots.filter(m => TEMPS_SOUS_CATEGORIES.includes(m.categorie)).length
    return mots.filter(m => m.categorie === cat).length
  }

  return (
    <div>
      {/* Barre de recherche */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div style={{
          position: 'absolute', left: '14px', top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <input
          type="text"
          placeholder="Rechercher en français ou en Dendi..."
          value={recherche}
          onChange={(e) => { setRecherche(e.target.value); setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => setShowSuggestions(true)}
          style={{
            width: '100%', padding: '12px 16px 12px 40px',
            borderRadius: '12px', border: '1px solid #3A3A3A',
            backgroundColor: '#161616', color: '#F5F0EB',
            fontSize: '14px', fontFamily: 'Georgia, serif', outline: 'none',
          }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            backgroundColor: '#1A1A1A', border: '1px solid #3A3A3A',
            borderRadius: '12px', marginTop: '4px', zIndex: 10, overflow: 'hidden',
          }}>
            {suggestions.map((mot) => (
              <div
                key={mot.id}
                onClick={() => { setRecherche(mot.fr); setShowSuggestions(false) }}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between',
                  borderBottom: '1px solid #2A2A2A',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#252525')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ color: '#F5F0EB', fontSize: '14px' }}>{mot.fr}</span>
                <span style={{ color: '#E07B39', fontSize: '13px' }}>{mot.dendi}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
        {CATEGORIES_ORDER.map((cat) => {
          if (cat === 'temps') {
            return (
              <div key="temps" style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTempsMenu(!showTempsMenu)}
                  style={{
                    padding: '8px 16px', borderRadius: '9999px',
                    fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                    fontFamily: 'Georgia, serif',
                    backgroundColor: isTempsActive ? '#E07B39' : 'transparent',
                    border: isTempsActive ? '1px solid #E07B39' : '1px solid #3A3A3A',
                    color: isTempsActive ? '#FFFFFF' : '#A89A8A',
                  }}
                >
                  Temps ▾ <span style={{ fontSize: '11px', opacity: 0.6 }}>({countForCat('temps')})</span>
                </button>
                {showTempsMenu && (
                  <div style={{
                    position: 'absolute', top: '115%', left: 0,
                    backgroundColor: '#1E1E1E',
                    border: '1px solid #E07B39',
                    borderRadius: '12px', zIndex: 20, overflow: 'hidden',
                    minWidth: '160px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}>
                    {TEMPS_SOUS_CATEGORIES.map((sub) => (
                      <div
                        key={sub}
                        onClick={() => { setActive(sub); setShowTempsMenu(false) }}
                        style={{
                          padding: '12px 20px', cursor: 'pointer',
                          color: active === sub ? '#E07B39' : '#D0C4B8',
                          fontSize: '13px', borderBottom: '1px solid #2A2A2A',
                          fontFamily: 'Georgia, serif',
                          backgroundColor: active === sub ? '#2A1500' : 'transparent',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = active === sub ? '#2A1500' : '#252525')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = active === sub ? '#2A1500' : 'transparent')}
                      >
                        {CATEGORIES_LABELS[sub]}
                        <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.6 }}>
                          ({mots.filter(m => m.categorie === sub).length})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={cat}
              onClick={() => { setActive(cat); setShowTempsMenu(false) }}
              style={{
                padding: '8px 16px', borderRadius: '9999px',
                fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                backgroundColor: active === cat ? '#E07B39' : 'transparent',
                border: active === cat ? '1px solid #E07B39' : '1px solid #3A3A3A',
                color: active === cat ? '#FFFFFF' : '#A89A8A',
              }}
            >
              {cat === 'Tous' ? (
                <span style={{ fontSize: '15px', lineHeight: 1 }}>⊞</span>
              ) : (
                <>
                  {CATEGORIES_LABELS[cat] ?? cat}
                  <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.6 }}>
                    ({countForCat(cat)})
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Résultats */}
      {motsFiltres.length === 0 ? (
        <p style={{ color: '#555', textAlign: 'center', marginTop: '40px' }}>
          Aucun mot trouvé pour "{recherche}"
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}>
          {motsFiltres.map((mot) => (
            <MotCard key={`${active}-${mot.id}`} mot={mot} />
          ))}
        </div>
      )}
    </div>
  )
}
