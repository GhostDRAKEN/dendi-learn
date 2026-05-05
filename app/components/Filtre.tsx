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

function formatCategorie(cat: string): string {
  const labels: Record<string, string> = {
    'Tous': 'Tous',
    'Salutations': 'Salutations',
    'temps__journee': 'Temps - Journée',
    'temps__repere': 'Temps - Repères',
    'temps__semaine': 'Temps - Semaine',
    'temps__mois': 'Temps - Mois',
    'corps': 'Corps humain',
    'verbes': 'Verbes',
  }
  return labels[cat] || cat
}

export default function Filtre({ mots }: { mots: Mot[] }) {
  const categories = ['Tous', ...Array.from(new Set(mots.map((m) => m.categorie)))]
  const [active, setActive] = useState('Tous')

  const motsFiltres = active === 'Tous' ? mots : mots.filter((m) => m.categorie === active)

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={
              active === cat
                ? { backgroundColor: 'var(--accent)', border: '1px solid var(--accent)', color: 'white' }
                : { backgroundColor: 'transparent', border: '1px solid var(--border)', color: '#A89A8A' }
            }
          >
            {formatCategorie(cat)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {motsFiltres.map((mot) => (
        <MotCard key={`${active}-${mot.id}`} mot={mot} />
        ))}
      </div>
    </div>
  )
}