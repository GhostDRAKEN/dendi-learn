'use client'
import { useState, useRef, useEffect } from 'react'
import MotCard from './MotCard'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

const CATEGORIES_ORDER = [
  'Tous', 'Salutations', 'temps__journee', 'temps__repere',
  'temps__semaine', 'temps__mois', 'corps', 'verbes', 'prepositions', 'noms',
]

const CATEGORIES_LABELS: Record<string, string> = {
  'Tous': 'Tous',
  'Salutations': 'Salutations',
  'temps__journee': 'Temps - Journée',
  'temps__repere': 'Temps - Repères',
  'temps__semaine': 'Temps - Semaine',
  'temps__mois': 'Temps - Mois',
  'corps': 'Corps humain',
  'verbes': 'Verbes',
  'prepositions': 'Prépositions',
  'noms': 'Noms & Adjectifs',
}

export default function Filtre({ mots }: { mots: Mot[] }) {
  const categoriesDisponibles = new Set(mots.map((m) => m.categorie))
  const categories = CATEGORIES_ORDER.filter(
    (cat) => cat === 'Tous' || categoriesDisponibles.has(cat)
  )
  const [active, setActive] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = recherche.length >= 2
    ? mots
        .filter((m) =>
          m.fr.toLowerCase().includes(recherche.toLowerCase()) ||
          m.dendi.toLowerCase().includes(recherche.toLowerCase())
        )
        .slice(0, 5)
    : []

  const motsFiltres = mots
    .filter((m) => active === 'Tous' || m.categorie === active)
    .filter((m) =>
      recherche === '' ||
      m.fr.toLowerCase().includes(recherche.toLowerCase()) ||
      m.dendi.toLowerCase().includes(recherche.toLowerCase()) ||
      m.phonetique.toLowerCase().includes(recherche.toLowerCase())
    )

  return (
    <div>
      {/* Barre de recherche avec loupe */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div style={{
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
}}>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
</div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher en français ou en Dendi..."
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value)
            setShowSuggestions(true)
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => setShowSuggestions(true)}
          style={{
            width: '100%',
            padding: '12px 16px 12px 40px',
            borderRadius: '12px',
            border: '1px solid #3A3A3A',
            backgroundColor: '#161616',
            color: '#F5F0EB',
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
            outline: 'none',
          }}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#1A1A1A',
            border: '1px solid #3A3A3A',
            borderRadius: '12px',
            marginTop: '4px',
            zIndex: 10,
            overflow: 'hidden',
          }}>
            {suggestions.map((mot) => (
              <div
                key={mot.id}
                onClick={() => {
                  setRecherche(mot.fr)
                  setShowSuggestions(false)
                }}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
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
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Georgia, serif',
              backgroundColor: active === cat ? '#E07B39' : 'transparent',
              border: active === cat ? '1px solid #E07B39' : '1px solid #3A3A3A',
              color: active === cat ? '#FFFFFF' : '#A89A8A',
            }}
          >
            {CATEGORIES_LABELS[cat] ?? cat}
            {cat !== 'Tous' && (
              <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.6 }}>
                ({mots.filter(m => m.categorie === cat).length})
              </span>
            )}
          </button>
        ))}
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