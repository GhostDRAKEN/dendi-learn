import { notFound } from 'next/navigation'
import GuidedLesson from '../../components/GuidedLesson'
import { createClient } from '@/lib/supabase/server'
import {
  buildCurriculum,
  flattenLessons,
  type CurriculumMot,
} from '@/lib/curriculum'

export default async function GuidedLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = await params
  const supabase = await createClient()
  const [{ data: mots, error }, { data: authData }] = await Promise.all([
    supabase.from('mots').select('id, fr, dendi, phonetique, categorie, niveau'),
    supabase.auth.getUser(),
  ])

  if (error || !mots) {
    return (
      <main className="guided-page">
        <section className="guided-load-error" role="alert">
          <h1>Leçon indisponible</h1>
          <p>Impossible de charger cette leçon pour le moment.</p>
        </section>
      </main>
    )
  }

  const curriculum = buildCurriculum(mots as CurriculumMot[])
  const lessons = flattenLessons(curriculum)
  const lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId)
  if (lessonIndex < 0) notFound()

  const lesson = lessons[lessonIndex]
  const unitIndex = curriculum.find(section => section.id === lesson.niveau)?.units.findIndex(unit => unit.id === lesson.unitId) ?? -1
  const nextLesson = lessons.slice(lessonIndex + 1).find((item) => item.mots.length > 0) ?? null

  return (
    <GuidedLesson
      lesson={lesson}
      unitNumber={unitIndex >= 0 ? unitIndex + 1 : undefined}
      nextLesson={nextLesson}
      userId={authData.user?.id ?? null}
    />
  )
}
