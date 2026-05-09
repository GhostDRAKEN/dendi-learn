'use client'

import { useState } from 'react'
import Filtre from './Filtre'
import BanniereInscription from './BanniereInscription'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function ApprendreClient({ mots, categorieInitiale }: { mots: Mot[], categorieInitiale?: string }) {
  const [vusCount, setVusCount] = useState(0)

  return (
    <>
      <Filtre
        mots={mots}
        categorieInitiale={categorieInitiale}
        onVusCountChange={setVusCount}
      />
      <BanniereInscription vusCount={vusCount} />
    </>
  )
}
