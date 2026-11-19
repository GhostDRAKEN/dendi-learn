import { createClient } from '@/lib/supabase/server'
import AppHeader from '../components/AppHeader'
import ApprendreClient from '../components/ApprendreClient'
import { getLearningWords, isNiveauId } from '@/lib/curriculum'
import { resolveExplorerTheme } from '@/lib/explorer-themes'

export default async function ApprendrePage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string | string[], niveau?: string | string[] }>
}) {
  const params = await searchParams
  const niveau = typeof params.niveau === 'string' && isNiveauId(params.niveau) ? params.niveau : undefined
  const supabase = await createClient()
  let query = supabase.from('mots').select('*')
  if (niveau) {
    query = query.eq('niveau', niveau)
  }

  const { data: mots, error } = await query

  if (error) return <p>Erreur : {error.message}</p>
  const learningWords = getLearningWords(mots ?? [])

  return (
    <main className="learn-page">
      <AppHeader page="apprendre" />

      <section className="learn-content" aria-labelledby="learn-title">
        <header className="learn-intro">
          <p className="learn-eyebrow">Bibliothèque Dendi</p>
          <h1 id="learn-title" className="learn-title">Apprendre à votre rythme</h1>
          <p className="learn-subtitle">Recherchez un mot ou découvrez le vocabulaire dendi par thème.</p>
        </header>

        <ApprendreClient mots={learningWords} theme={resolveExplorerTheme(params.categorie, learningWords)} niveau={niveau} />
      </section>
    </main>
  )
}
