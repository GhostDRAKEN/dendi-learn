import { createClient } from '@/lib/supabase/server'
import QuizWrapper from '../components/QuizWrapper'
import AppHeader from '../components/AppHeader'
import ApprendreClient from '../components/ApprendreClient'
import Link from 'next/link'

export default async function ApprendrePage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string, niveau?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  let query = supabase.from('mots').select('*')
  if (params.niveau) {
    query = query.eq('niveau', params.niveau)
  }

  const { data: mots, error } = await query

  if (error) return <p>Erreur : {error.message}</p>

  return (
    <main className="learn-page">
      <AppHeader actions={<QuizWrapper mots={mots ?? []} />} />

      <section className="learn-content" aria-labelledby="learn-title">
        <div className="learn-intro">
          <div>
            <p className="learn-eyebrow">Bibliothèque Dendi</p>
            <h2 id="learn-title" className="learn-title">Apprendre à votre rythme</h2>
            <p className="learn-subtitle">
              Recherchez un mot, choisissez une catégorie ou explorez librement les cartes.
            </p>
          </div>

          <div className="learn-level-summary">
            <span className="learn-level-label">Niveau actuel</span>
            <span className={`learn-level-value learn-level-${params.niveau ?? 'tous'}`}>
              {params.niveau === 'debutant'
                ? '🌱 Débutant'
                : params.niveau === 'intermediaire'
                  ? '🔥 Intermédiaire'
                  : params.niveau === 'avance'
                    ? '⭐ Avancé'
                    : 'Tous les niveaux'}
            </span>
            <Link href="/niveaux" className="learn-level-link">
              {params.niveau ? 'Changer' : 'Choisir un niveau'}
            </Link>
          </div>
        </div>

        <ApprendreClient mots={mots ?? []} categorieInitiale={params.categorie} niveau={params.niveau} />
      </section>
    </main>
  )
}
