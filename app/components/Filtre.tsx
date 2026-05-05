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

const CATEGORIES_ORDER = [
  'Tous',
  'Salutations',
  'temps__journee',
  'temps__repere',
  'temps__semaine',
  'temps__mois',
  'corps',
  'verbes',
  'prepositions',
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
}

export default function Filtre({ mots }: { mots: Mot[] }) {
  const categoriesDisponibles = new Set(mots.map((m) => m.categorie))
  const categories = CATEGORIES_ORDER.filter(
    (cat) => cat === 'Tous' || categoriesDisponibles.has(cat)
  )
  const [active, setActive] = useState('Tous')
  const motsFiltres = active === 'Tous' ? mots : mots.filter((m) => m.categorie === active)

  return (
    <div>
      {/* Barre de filtres */}
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
          </button>
        ))}
      </div>

      {/* Grille de cartes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
      }}>
        {motsFiltres.map((mot) => (
          <MotCard key={`${active}-${mot.id}`} mot={mot} />
        ))}
      </div>
    </div>
  )
}