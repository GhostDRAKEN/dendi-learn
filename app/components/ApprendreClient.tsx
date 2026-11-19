'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase/client'
import { createExplorerAccountProgress } from '@/lib/explorer-account-progress'
import { guestWordHistory, subscribeToGuestWordHistory } from '@/lib/guest-word-history'
import Filtre from './Filtre'
import BanniereInscription from './BanniereInscription'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

const noSubscription = () => () => {}

export default function ApprendreClient({ mots, categorieInitiale, niveau }: { 
  mots: Mot[]
  categorieInitiale?: string
  niveau?: string
}) {
  const [progress] = useState(() => createExplorerAccountProgress({
    async load(userId) {
      const { data, error } = await supabase
        .from('progression')
        .select('mot_id')
        .eq('user_id', userId)
        .eq('vu', true)
      if (error) throw error
      return data.map(row => row.mot_id as number)
    },
    async save(userId, wordId) {
      const { error } = await supabase.from('progression').upsert({
        user_id: userId,
        mot_id: wordId,
        vu: true,
      }, { onConflict: 'user_id,mot_id' })
      if (error) throw error
    },
  }))
  const account = useSyncExternalStore(progress.subscribe, progress.getSnapshot, progress.getServerSnapshot)
  const isGuest = account.owner === 'guest'
  const guest = useSyncExternalStore(
    isGuest ? subscribeToGuestWordHistory : noSubscription,
    isGuest ? guestWordHistory.getSnapshot : guestWordHistory.getServerSnapshot,
    guestWordHistory.getServerSnapshot,
  )

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      progress.setOwner(session?.user.id ?? null)
    })
    return () => {
      subscription.unsubscribe()
      progress.setOwner(undefined)
    }
  }, [progress])

  const handleMotVu = (motId: number) => {
    if (progress.getSnapshot().scope !== account.scope) return
    if (isGuest) guestWordHistory.consult(motId)
    else progress.consult(account.scope, motId)
  }
  const counterState = isGuest ? (guest.status === 'loading' ? 'loading' : 'ready') : account.status
  const motsDejaVus = isGuest ? guest.ids : account.ids
  const notice = isGuest
    ? guest.status === 'temporary'
      ? 'Stockage local indisponible. Les nouvelles consultations restent dans cet onglet.'
      : guest.status === 'invalid'
        ? 'L’historique local est illisible. Les nouvelles consultations restent dans cet onglet.'
        : null
    : account.status === 'error'
      ? 'Impossible de charger les mots déjà vus sur ce compte.'
      : account.saveFailed
        ? 'Certaines consultations de cet onglet n’ont pas pu être enregistrées sur votre compte.'
        : null

  return (
    <>
      <Filtre
        mots={mots}
        categorieInitiale={categorieInitiale}
        onMotVu={account.owner === 'checking' ? undefined : handleMotVu}
        motsDejaVus={motsDejaVus}
        historyScope={account.scope}
        counterState={counterState}
        isGuest={isGuest}
        progressNotice={notice}
        onResetHistory={isGuest && guest.status === 'invalid' ? guestWordHistory.resetInvalidHistory : undefined}
        niveauActif={niveau}
      />
      {isGuest && <BanniereInscription vusCount={guest.ids.size} />}
    </>
  )
}
