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
  'Tous', 'Salutations', 'temps', 'corps', 'verbes', 'prepositions', 'noms', 'couleurs',
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
  'couleurs': 'Couleurs',
}

export default function Filtre({ mots }: { mots: Mot[] }) {
  const [active, setActive] = useState('Tous')
  const [recherche, setRecherche] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showTempsMenu, setShowTempsMenu] = useState(false)
  const [vusIds, setVusIds] = useState<Set<number>>(new Set())

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

  const handleCategorieChange = (cat: string) => {
    setActive(cat)
    setShowTempsMenu(false)
    setVusIds(new Set())
  }

  const handleVue = (id: number) => {
    setVusIds(prev => new Set(prev).add(id))
  }

  const vusCount = motsFiltres.filter(m => vusIds.has(m.id)).length
  const total = motsFiltres.length
  const progression = total > 0 ? Math.round((vusCount / total) * 100) : 0

  return (
    <div>
      {/* Barre de recherche */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div style={{
          position: 'absolute', left: '14px', top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            borderRadius: '12px', border: '1px solid var(--border)',
            backgroundColor: 'var(--input-bg)', color: 'var(--text)',
            fontSize: '14px', fontFamily: 'Georgia, serif', outline: 'none',
          }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            backgroundColor: 'var(--dropdown-bg)', border: '1px solid var(--border)',
            borderRadius: '12px', marginTop: '4px', zIndex: 10, overflow: 'hidden',
          }}>
            {suggestions.map((mot) => (
              <div
                key={mot.id}
                onClick={() => { setRecherche(mot.fr); setShowSuggestions(false) }}
                style={{
                  padding: '10px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ color: 'var(--text)', fontSize: '14px' }}>{mot.fr}</span>
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
                    border: isTempsActive ? '1px solid #E07B39' : '1px solid var(--border)',
                    color: isTempsActive ? '#FFFFFF' : 'var(--text-muted)',
                  }}
                >
                  Temps ▾ <span style={{ fontSize: '11px', opacity: 0.6 }}>({countForCat('temps')})</span>
                </button>
                {showTempsMenu && (
                  <div style={{
                    position: 'absolute', top: '115%', left: 0,
                    backgroundColor: 'var(--dropdown-bg)',
                    border: '1px solid #E07B39',
                    borderRadius: '12px', zIndex: 20, overflow: 'hidden',
                    minWidth: '160px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}>
                    {TEMPS_SOUS_CATEGORIES.map((sub) => (
                      <div
                        key={sub}
                        onClick={() => handleCategorieChange(sub)}
                        style={{
                          padding: '12px 20px', cursor: 'pointer',
                          color: active === sub ? '#E07B39' : 'var(--text)',
                          fontSize: '13px', borderBottom: '1px solid var(--border)',
                          fontFamily: 'Georgia, serif',
                          backgroundColor: active === sub ? '#2A1500' : 'transparent',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = active === sub ? '#2A1500' : 'var(--border)')}
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
              onClick={() => handleCategorieChange(cat)}
              style={{
                padding: '8px 16px', borderRadius: '9999px',
                fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                backgroundColor: active === cat ? '#E07B39' : 'transparent',
                border: active === cat ? '1px solid #E07B39' : '1px solid var(--border)',
                color: active === cat ? '#FFFFFF' : 'var(--text-muted)',
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

      {/* Barre de progression */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '8px',
        }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '1px' }}>
            {progression === 100 ? '✓ Série complète' : 'Progression'}
          </span>
          <span style={{
            color: progression === 100 ? '#E07B39' : 'var(--text-muted)',
            fontSize: '12px', fontWeight: '600', letterSpacing: '1px',
            transition: 'color 0.3s ease',
          }}>
            {vusCount} / {total} vus
          </span>
        </div>
        <div style={{
          width: '100%', height: '25px',
          backgroundColor: 'var(--border)',
          borderRadius: '9999px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${progression}%`,
            backgroundColor: progression === 100 ? '#E07B39' : 'var(--text-muted)',
            borderRadius: '9999px',
            transition: 'width 0.4s ease, background-color 0.4s ease',
          }} />
        </div>
      </div>

      {/* Résultats */}
      {motsFiltres.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>
          Aucun mot trouvé pour &quot;{recherche}&quot;
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
        }}>
          {motsFiltres.map((mot) => (
            <MotCard
              key={`${active}-${mot.id}`}
              mot={mot}
              onVue={() => handleVue(mot.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
