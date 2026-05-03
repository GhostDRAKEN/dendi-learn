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
            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
              active === cat ? 'bg-white text-black' : 'text-white hover:bg-white hover:text-black'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {motsFiltres.map((mot) => (
          <MotCard key={mot.id} mot={mot} />
        ))}
      </div>
    </div>
  )
}