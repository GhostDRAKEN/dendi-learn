import AppHeader from '../components/AppHeader'
import ParcoursOverview from '../components/ParcoursOverview'
import { createClient } from '@/lib/supabase/server'
import {
  buildCurriculum,
  getRecommendedLesson,
  isNiveauId,
  type CurriculumMot,
  type ProgressionMot,
} from '@/lib/curriculum'

export default async function ParcoursPage({
  searchParams,
}: {
  searchParams: Promise<{ niveau?: string }>
}) {
  const params = await searchParams
  const niveau = isNiveauId(params.niveau) ? params.niveau : 'debutant'
  const supabase = await createClient()
  const [{ data: mots, error: motsError }, { data: authData }] = await Promise.all([
    supabase.from('mots').select('id, fr, dendi, phonetique, categorie, niveau'),
    supabase.auth.getUser(),
  ])

  if (motsError || !mots) {
    return (
      <main className="path-page">
        <AppHeader />
        <section className="path-load-error" role="alert">
          <h2>Parcours indisponible</h2>
          <p>Impossible de charger les leçons pour le moment.</p>
        </section>
      </main>
    )
  }

  const user = authData.user
  let progression: ProgressionMot[] = []
  let progressionAvailable = true

  if (user) {
    const { data, error } = await supabase
      .from('progression')
      .select('mot_id, vu, maitrise')
      .eq('user_id', user.id)

    progressionAvailable = !error
    progression = (data ?? []) as ProgressionMot[]
  }

  const curriculum = buildCurriculum(mots as CurriculumMot[])
  const section = curriculum.find((item) => item.id === niveau) ?? curriculum[0]
  const recommendedLesson = getRecommendedLesson(curriculum, niveau, progression)

  if (!section || !recommendedLesson) {
    return (
      <main className="path-page">
        <AppHeader />
        <section className="path-load-error" role="status">
          <h2>Aucune leçon disponible</h2>
          <p>Le parcours ne contient pas encore de mots pour ce niveau.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="path-page">
      <AppHeader />
      <ParcoursOverview
        section={section}
        progression={progression}
        authenticated={Boolean(user)}
        progressionAvailable={progressionAvailable}
        recommendedLesson={recommendedLesson}
      />
    </main>
  )
}
