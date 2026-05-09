'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  const handleVusCountChange = async (count: number) => {
    setVusCount(count)
  }

  const handleMotVu = async (motId: number) => {
    if (!userId) return
    await supabase.from('progression').upsert({
      user_id: userId,
      mot_id: motId,
      vu: true,
    }, { onConflict: 'user_id,mot_id' })
  }

  return (
    <>
      <Filtre
        mots={mots}
        categorieInitiale={categorieInitiale}
        onVusCountChange={handleVusCountChange}
        onMotVu={handleMotVu}
      />
      <BanniereInscription vusCount={vusCount} />
    </>
  )
}