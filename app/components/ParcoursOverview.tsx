'use client'

import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'
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
  const [levelPickerOpen, setLevelPickerOpen] = useState(false)
  const [openUnitIds, setOpenUnitIds] = useState<Set<string>>(() => new Set())
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
  const sectionWords = sectionLessons.flatMap((lesson) => lesson.mots)
  const masteredWordIds = new Set(
    progression.filter((item) => item.maitrise).map((item) => item.mot_id),
  )
  const masteredWords = sectionWords.filter((mot) => masteredWordIds.has(mot.id)).length
  const lessonToContinueProgress = getLessonProgress(lessonToContinue, progression)
  const continueLabel = localResume || (authenticated && lessonToContinueProgress.seen > 0)
    ? 'Reprendre'
    : 'Continuer'
  const otherUnits = section.units.filter((_, unitIndex) => unitIndex !== activeUnitIndex)
  const allUnitsOpen = otherUnits.length > 0 && otherUnits.every((unit) => openUnitIds.has(unit.id))

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

  const toggleUnit = (unitId: string) => {
    setOpenUnitIds((current) => {
      const next = new Set(current)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  const toggleFullProgram = () => {
    setOpenUnitIds(allUnitsOpen ? new Set() : new Set(otherUnits.map((unit) => unit.id)))
  }

  return (
    <section className="path-content" aria-labelledby="path-title">
      <header className="path-intro">
        <div>
          <p className="path-eyebrow">Mon parcours</p>
          <h2 id="path-title" className="path-title">Prochaine étape</h2>
        </div>

        <div className="path-level-picker">
          <div className="path-level-current">
            <span>Niveau : <strong>{LEVEL_LABELS[section.id]}</strong></span>
            <button
              type="button"
              className="path-level-toggle"
              aria-expanded={levelPickerOpen}
              aria-controls="path-level-options"
              onClick={() => setLevelPickerOpen((open) => !open)}
            >
              {levelPickerOpen ? 'Fermer' : 'Changer'}
            </button>
          </div>
          {levelPickerOpen && (
            <div id="path-level-options" className="path-level-options" aria-label="Choisir le niveau du parcours">
              {NIVEAUX.map((niveau) => (
                <Link
                  key={niveau}
                  href={`/parcours?niveau=${niveau}`}
                  className={`path-level-link${section.id === niveau ? ' is-active' : ''}`}
                  aria-current={section.id === niveau ? 'page' : undefined}
                  onClick={() => setLevelPickerOpen(false)}
                >
                  {LEVEL_LABELS[niveau]}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      <article className="path-continue-card">
        <div className="path-continue-copy">
          <p className="path-continue-eyebrow">{continueLabel}</p>
          <h3>
            {lessonToContinue.unitTitle}
            <span> · Leçon {lessonToContinue.index}</span>
          </h3>
          <p>
            {lessonToContinue.mots.length} mots
            {authenticated && progressionAvailable && lessonStatus(lessonToContinue) && (
              <><span aria-hidden="true"> · </span>{STATUS_LABELS[lessonStatus(lessonToContinue) as LessonStatus]}</>
            )}
          </p>
        </div>
        <Link href={`/parcours/${lessonToContinue.id}`} className="path-primary-action">
          {continueLabel} <span aria-hidden="true">→</span>
        </Link>
      </article>

      {!authenticated && (
        <p className="path-info" role="note">
          Progression conservée sur cet appareil. Connectez-vous pour la synchroniser.
        </p>
      )}

      {authenticated && !progressionAvailable && (
        <p className="path-info path-info-warning" role="status">
          Votre progression ne peut pas être chargée pour le moment. Toutes les leçons restent accessibles.
        </p>
      )}

      <div className="path-units path-current-unit">
        {activeUnit && (
          <section className="path-unit is-current" aria-labelledby={`${activeUnit.id}-title`}>
            <header className="path-unit-header">
              <div>
                <p className="path-unit-kicker">Unité actuelle</p>
                <h3 id={`${activeUnit.id}-title`}>{activeUnit.title}</h3>
              </div>
              <span>
                {authenticated && progressionAvailable
                  ? `${activeUnit.lessons.filter((lesson) => lessonStatus(lesson) === 'maitrisee').length} sur ${activeUnit.lessons.length} maîtrisées`
                  : `Leçon ${lessonToContinue.index} sur ${activeUnit.lessons.length}`}
              </span>
            </header>
            {renderLessonList(activeUnit.lessons)}
          </section>
        )}
      </div>

      <section className="path-level-progress" aria-label={`Progression du niveau ${LEVEL_LABELS[section.id]}`}>
        <div>
          <p className="path-section-eyebrow">Progression du niveau</p>
          <strong>{LEVEL_LABELS[section.id]}</strong>
        </div>
        {authenticated && progressionAvailable ? (
          <p>
            <strong>{masteredWords}</strong> mot{masteredWords > 1 ? 's' : ''} maîtrisé{masteredWords > 1 ? 's' : ''} sur {sectionWords.length}
            <span>{masteredLessons} leçon{masteredLessons > 1 ? 's' : ''} maîtrisée{masteredLessons > 1 ? 's' : ''} sur {sectionLessons.length}</span>
          </p>
        ) : (
          <p>{sectionWords.length} mots · {sectionLessons.length} leçons</p>
        )}
      </section>

      <section className="path-program" aria-labelledby="path-program-title">
        <div className="path-section-heading">
          <div>
            <p className="path-section-eyebrow">Programme</p>
            <h3 id="path-program-title">Le reste du parcours</h3>
          </div>
          {otherUnits.length > 0 && (
            <button type="button" className="path-program-toggle" onClick={toggleFullProgram}>
              {allUnitsOpen ? 'Réduire le programme' : 'Voir tout le programme'}
            </button>
          )}
        </div>

        <div className="path-units path-units-compact">
          {section.units.map((unit, unitIndex) => {
            if (unitIndex === activeUnitIndex) return null
            const isOpen = openUnitIds.has(unit.id)
            const unitLabel = unitIndex < activeUnitIndex ? 'Unité précédente' : 'Unité suivante'

            return (
              <section key={unit.id} className={`path-unit path-unit-compact${unitIndex < activeUnitIndex ? ' is-previous' : ' is-next'}`}>
                <button
                  type="button"
                  className="path-unit-summary"
                  aria-expanded={isOpen}
                  aria-controls={`${unit.id}-lessons`}
                  onClick={() => toggleUnit(unit.id)}
                >
                  <span>
                    <small>{unitLabel}</small>
                    <strong>{unit.title}</strong>
                  </span>
                  <span className="path-unit-summary-meta">
                    {unit.lessons.length} leçon{unit.lessons.length > 1 ? 's' : ''}
                    <span className="path-unit-summary-action">{isOpen ? 'Masquer' : 'Voir'}</span>
                    <span className="path-unit-chevron" aria-hidden="true">⌄</span>
                  </span>
                </button>
                {isOpen && (
                  <div id={`${unit.id}-lessons`}>
                    {renderLessonList(unit.lessons)}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </section>

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
