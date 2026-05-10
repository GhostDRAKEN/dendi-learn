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
  const [motsDejaVus, setMotsDejaVus] = useState<Set<number>>(new Set())

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return
      setUserId(user.id)

      const { data: progression } = await supabase
        .from('progression')
        .select('mot_id')
        .eq('user_id', user.id)
        .eq('vu', true)

      if (progression) {
        const ids = new Set(progression.map(p => p.mot_id as number))
        setMotsDejaVus(ids)
        setVusCount(ids.size)
      }
    })
  }, [])

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
        onVusCountChange={setVusCount}
        onMotVu={handleMotVu}
        motsDejaVus={motsDejaVus}
      />
      <BanniereInscription vusCount={vusCount} />
    </>
  )
}