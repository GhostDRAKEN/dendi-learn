'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import {
  getLessonProgress,
  getLessonStatus,
  NIVEAUX,
  type CurriculumLesson,
  type CurriculumSection,
  type LessonStatus,
  type ProgressionMot,
} from '@/lib/curriculum'

const RESUME_KEY = 'dendi-guided-resume'

const LEVEL_LABELS = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
}

const STATUS_LABELS: Record<LessonStatus, string> = {
  'a-decouvrir': 'À découvrir',
  'en-cours': 'En cours',
  'decouverte-complete': 'Découverte complète',
  'maitrisee': 'Maîtrisée',
}

const STATUS_ICONS: Record<LessonStatus, string> = {
  'a-decouvrir': '○',
  'en-cours': '→',
  'decouverte-complete': '◐',
  'maitrisee': '✓',
}

function subscribeToResume(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('dendi-guided-resume', callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('dendi-guided-resume', callback)
  }
}

function getResumeSnapshot() {
  try {
    return window.localStorage.getItem(RESUME_KEY)
  } catch {
    return null
  }
}

function getResumeServerSnapshot() {
  return null
}

export default function ParcoursOverview({
  section,
  progression,
  authenticated,
  progressionAvailable,
  recommendedLesson,
}: {
  section: CurriculumSection
  progression: ProgressionMot[]
  authenticated: boolean
  progressionAvailable: boolean
  recommendedLesson: CurriculumLesson
}) {
  const storedResumeId = useSyncExternalStore(
    subscribeToResume,
    getResumeSnapshot,
    getResumeServerSnapshot,
  )
  const sectionLessons = section.units.flatMap((unit) => unit.lessons)
  const localResume = !authenticated
    ? sectionLessons.find((lesson) => lesson.id === storedResumeId)
    : null
  const lessonToContinue = localResume ?? recommendedLesson
  const matchingUnitIndex = section.units.findIndex((unit) =>
    unit.lessons.some((lesson) => lesson.id === lessonToContinue.id),
  )
  const activeUnitIndex = matchingUnitIndex >= 0 ? matchingUnitIndex : Math.max(0, section.units.length - 1)
  const activeUnit = section.units[activeUnitIndex]
  const masteredLessons = progressionAvailable
    ? sectionLessons.filter((lesson) => getLessonStatus(lesson, progression) === 'maitrisee').length
    : 0

  const lessonStatus = (lesson: CurriculumLesson) => {
    if (authenticated && !progressionAvailable) return null
    if (!authenticated) return lesson.id === localResume?.id ? 'en-cours' : 'a-decouvrir'
    return getLessonStatus(lesson, progression)
  }

  const renderLessonList = (lessons: CurriculumLesson[]) => (
    <div className="path-lesson-list">
      {lessons.map((lesson) => {
        const status = lessonStatus(lesson)
        const progress = getLessonProgress(lesson, progression)
        const isRecommended = lesson.id === lessonToContinue.id

        return (
          <Link
            key={lesson.id}
            href={`/parcours/${lesson.id}`}
            className={`path-lesson${isRecommended ? ' is-recommended' : ''}${status ? ` is-${status}` : ''}`}
          >
            <span className="path-lesson-icon" aria-hidden="true">
              {status ? STATUS_ICONS[status] : '○'}
            </span>
            <span className="path-lesson-copy">
              <strong>Leçon {lesson.index}</strong>
              <small>{lesson.mots.length} mots</small>
            </span>
            <span className="path-lesson-status">
              {isRecommended && status !== 'maitrisee'
                ? authenticated && status === 'en-cours' ? 'À reprendre' : 'Recommandée'
                : status ? STATUS_LABELS[status] : 'Disponible'}
              {authenticated && progressionAvailable && progress.seen > 0 && status !== 'maitrisee' && (
                <small>{progress.seen}/{progress.total} vus</small>
              )}
            </span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <section className="path-content" aria-labelledby="path-title">
      <header className="path-intro">
        <div>
          <p className="path-eyebrow">Mon parcours</p>
          <h2 id="path-title" className="path-title">Apprendre pas à pas</h2>
          <p className="path-subtitle">
            Une prochaine leçon claire, quelques mots à la fois, sans perdre l’accès au lexique complet.
          </p>
        </div>

        <div className="path-level-picker" aria-label="Choisir le niveau du parcours">
          <span className="path-level-label">Niveau actuel</span>
          <div className="path-level-options">
            {NIVEAUX.map((niveau) => (
              <Link
                key={niveau}
                href={`/parcours?niveau=${niveau}`}
                className={`path-level-link${section.id === niveau ? ' is-active' : ''}`}
                aria-current={section.id === niveau ? 'page' : undefined}
              >
                {LEVEL_LABELS[niveau]}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {!authenticated && (
        <p className="path-info" role="note">
          Votre point de reprise est conservé uniquement sur cet appareil. Connectez-vous pour synchroniser votre progression.
        </p>
      )}

      {authenticated && !progressionAvailable && (
        <p className="path-info path-info-warning" role="status">
          Votre progression ne peut pas être chargée pour le moment. Toutes les leçons restent accessibles.
        </p>
      )}

      <article className="path-continue-card">
        <div className="path-continue-copy">
          <p className="path-continue-eyebrow">Continuer</p>
          <h3>{lessonToContinue.unitTitle}</h3>
          <p>
            Leçon {lessonToContinue.index} sur {lessonToContinue.totalInUnit}
            <span aria-hidden="true"> · </span>
            {lessonToContinue.mots.length} mots
          </p>
        </div>
        <Link href={`/parcours/${lessonToContinue.id}`} className="path-primary-action">
          {localResume ? 'Reprendre' : 'Continuer'} <span aria-hidden="true">→</span>
        </Link>
      </article>

      <div className="path-section-heading">
        <div>
          <p className="path-section-eyebrow">{section.title}</p>
          <h3>{section.intention}</h3>
        </div>
        {authenticated && progressionAvailable && (
          <span>{masteredLessons} / {sectionLessons.length} maîtrisées</span>
        )}
      </div>

      <div className="path-units">
        {activeUnit && (
          <section className="path-unit is-current" aria-labelledby={`${activeUnit.id}-title`}>
            <header className="path-unit-header">
              <div>
                <p className="path-unit-kicker">Unité actuelle</p>
                <h3 id={`${activeUnit.id}-title`}>{activeUnit.title}</h3>
              </div>
              <span>
                {authenticated && progressionAvailable
                  ? `Progression : ${activeUnit.lessons.filter((lesson) => lessonStatus(lesson) === 'maitrisee').length} / ${activeUnit.lessons.length}`
                  : `Leçon ${lessonToContinue.index} sur ${activeUnit.lessons.length}`}
              </span>
            </header>
            {renderLessonList(activeUnit.lessons)}
          </section>
        )}

        {section.units.map((unit, unitIndex) => unitIndex !== activeUnitIndex && (
          <details key={unit.id} className={`path-unit path-unit-compact${unitIndex < activeUnitIndex ? ' is-previous' : ' is-next'}`}>
            <summary className="path-unit-summary">
              <span>
                <small>{unitIndex < activeUnitIndex ? 'Unité précédente' : 'Unité suivante'}</small>
                <strong>{unit.title}</strong>
              </span>
              <span className="path-unit-summary-meta">
                {unit.lessons.length} leçon{unit.lessons.length > 1 ? 's' : ''}
                <span aria-hidden="true">⌄</span>
              </span>
            </summary>
            {renderLessonList(unit.lessons)}
          </details>
        ))}
      </div>

      <aside className="path-explorer-callout">
        <div>
          <p className="path-section-eyebrow">Besoin d’un mot précis ?</p>
          <h3>Le lexique complet reste disponible.</h3>
        </div>
        <Link href="/apprendre" className="path-secondary-action">
          Explorer les 182 mots <span aria-hidden="true">→</span>
        </Link>
      </aside>
    </section>
  )
}
