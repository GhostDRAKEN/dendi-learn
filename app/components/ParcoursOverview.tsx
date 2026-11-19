'use client'

import Link from 'next/link'
import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  NIVEAUX,
  type CurriculumLesson,
  type CurriculumSection,
  type NiveauId,
} from '@/lib/curriculum'
import {
  getLessonProgressSnapshot,
  getParcoursProgress,
  getRecordedLessonState,
  isLessonProgressPersistent,
  parseLessonRecords,
  subscribeToLessonProgress,
  type LessonState,
} from '@/lib/lesson-progress'
import {
  formatLessonCompletion,
  getLessonSuggestionCopy,
  getUnitToggleLabel,
  lessonLabel,
} from '@/lib/parcours-copy'

const RESUME_KEY = 'dendi-guided-resume'

const LEVEL_LABELS = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
}

const STATUS_LABELS: Record<LessonState, string> = {
  'not-started': 'Non commencée',
  'in-progress': 'En cours',
  'completed': 'Terminée',
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
  userId,
  progressionAvailable,
  recommendedLesson,
  nextSection,
  lexiconWordCount,
}: {
  section: CurriculumSection
  userId: string | null
  progressionAvailable: boolean
  recommendedLesson: CurriculumLesson
  nextSection: NiveauId | null
  lexiconWordCount: number
}) {
  const [levelPickerOpen, setLevelPickerOpen] = useState(false)
  const [openUnitIds, setOpenUnitIds] = useState<Set<string>>(() => new Set())
  const storedResumeId = useSyncExternalStore(
    subscribeToResume,
    getResumeSnapshot,
    getResumeServerSnapshot,
  )
  const rawLessonProgress = useSyncExternalStore(
    subscribeToLessonProgress,
    () => getLessonProgressSnapshot(userId),
    (): string | null => null,
  )
  const records = useMemo(() => parseLessonRecords(rawLessonProgress), [rawLessonProgress])
  const progressReady = rawLessonProgress !== null
  const sectionLessons = section.units.flatMap((unit) => unit.lessons)
  const levelProgress = getParcoursProgress(section, records, userId ? null : storedResumeId, recommendedLesson.id)
  const lessonToContinue = levelProgress.lesson
  const matchingUnitIndex = section.units.findIndex((unit) =>
    unit.lessons.some((lesson) => lesson.id === lessonToContinue?.id),
  )
  const activeUnitIndex = matchingUnitIndex >= 0 ? matchingUnitIndex : Math.max(0, section.units.length - 1)
  const activeUnit = section.units[activeUnitIndex]
  const sectionWords = sectionLessons.flatMap((lesson) => lesson.mots)
  const isInProgress = lessonToContinue && getRecordedLessonState(records[lessonToContinue.id]) === 'in-progress'
  const levelCompleted = progressReady && !lessonToContinue && levelProgress.total > 0
  const title = levelCompleted ? 'Niveau terminé' : isInProgress ? 'Continuer mon parcours' : levelProgress.completed > 0 ? 'Prochaine leçon' : 'Commencer mon parcours'
  const continueLabel = levelCompleted
    ? nextSection ? 'Découvrir le niveau suivant' : 'Explorer le lexique'
    : isInProgress ? 'Reprendre' : levelProgress.completed > 0 ? 'Passer à la suivante' : 'Commencer'
  const continueHref = lessonToContinue
    ? `/parcours/${lessonToContinue.id}`
    : nextSection ? `/parcours?niveau=${nextSection}` : '/apprendre'
  const otherUnits = section.units.filter((_, unitIndex) => unitIndex !== activeUnitIndex)
  const allUnitsOpen = otherUnits.length > 0 && otherUnits.every((unit) => openUnitIds.has(unit.id))
  const activeUnitCompleted = activeUnit?.lessons.filter(lesson => getRecordedLessonState(records[lesson.id]) === 'completed').length ?? 0
  const suggestedLaterStart = progressReady && levelProgress.completed === 0 && lessonToContinue && !isInProgress
    && lessonToContinue.id !== sectionLessons[0]?.id
  const suggestionCopy = getLessonSuggestionCopy({
    lessonId: lessonToContinue?.id ?? null,
    resumeId: userId ? null : storedResumeId,
    wordProgressLessonId: suggestedLaterStart && userId && progressionAvailable ? recommendedLesson.id : null,
  })

  const lessonStatus = (lesson: CurriculumLesson) => getRecordedLessonState(records[lesson.id])

  const renderLessonList = (lessons: CurriculumLesson[]) => (
    <div className="path-lesson-list">
      {lessons.map((lesson) => {
        const status = lessonStatus(lesson)
        const isRecommended = lesson.id === lessonToContinue?.id && status === 'not-started'
        const action = status === 'completed' ? 'Revoir' : status === 'in-progress' ? 'Reprendre' : 'Commencer'

        return (
          <Link
            key={lesson.id}
            href={`/parcours/${lesson.id}`}
            className={`path-lesson is-${status}`}
            aria-label={`Leçon ${lesson.index}, ${lesson.unitTitle}, ${lesson.mots.length} mots. ${progressReady ? STATUS_LABELS[status] : 'Chargement du suivi'}.${isRecommended ? ' Suggérée.' : ''} ${action}`}
          >
            <span className="path-lesson-copy">
              <strong>
                {status === 'completed' && (
                  <svg className="path-lesson-check" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m4 10 4 4 8-8" /></svg>
                )}
                Leçon {lesson.index}
              </strong>
              <small>{lesson.mots.length} mots <span aria-hidden="true">· </span><span className="path-lesson-state">{progressReady ? STATUS_LABELS[status] : 'Chargement…'}</span></small>
              {isRecommended && <small className="path-lesson-recommendation">Suggérée</small>}
            </span>
            <span className="path-lesson-action">{action} <span aria-hidden="true">→</span></span>
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
          <h2 id="path-title" className="path-title">{title}</h2>
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
          <p className="path-continue-eyebrow">{levelCompleted ? 'Bravo pour ce niveau' : isInProgress ? 'Leçon en cours' : suggestionCopy.heading}</p>
          <h3>
            {lessonToContinue ? lessonToContinue.unitTitle : LEVEL_LABELS[section.id]}
            {lessonToContinue && <span>Leçon {lessonToContinue.index}</span>}
          </h3>
          <p>
            {lessonToContinue
              ? <>{lessonToContinue.mots.length} mots <span aria-hidden="true">· </span>{progressReady ? STATUS_LABELS[lessonStatus(lessonToContinue)] : 'Chargement du suivi…'}</>
              : formatLessonCompletion(levelProgress.completed, levelProgress.total)}
          </p>
          {suggestionCopy.detail && <p className="path-recommendation-note">{suggestionCopy.detail}</p>}
        </div>
        <Link href={continueHref} className="path-primary-action">
          {continueLabel} <span aria-hidden="true">→</span>
        </Link>
      </article>

      <section className="path-level-progress" aria-label={`Progression du niveau ${LEVEL_LABELS[section.id]}`}>
        <div className="path-level-progress-heading">
          <p className="path-section-eyebrow">Progression du niveau</p>
          <strong>{LEVEL_LABELS[section.id]}</strong>
        </div>
        <p id="path-progress-count" className="path-level-progress-count" aria-live="polite">
          {progressReady ? <><strong>{levelProgress.completed}</strong> {lessonLabel(levelProgress.completed, true)} sur {levelProgress.total}</> : 'Chargement du suivi des leçons…'}
        </p>
        <div
          className="path-level-progress-track"
          role="progressbar"
          aria-label={`Leçons terminées du niveau ${LEVEL_LABELS[section.id]}`}
          aria-valuemin={0}
          aria-valuemax={levelProgress.total}
          aria-valuenow={progressReady ? levelProgress.completed : undefined}
          aria-valuetext={progressReady ? formatLessonCompletion(levelProgress.completed, levelProgress.total) : 'Chargement du suivi'}
        >
          <div style={{ width: `${progressReady ? levelProgress.percent : 0}%` }} />
        </div>
        <p className="path-level-progress-note" role="note">
          {progressReady && !isLessonProgressPersistent(userId)
            ? 'Le stockage local est indisponible : votre progression dans les leçons reste disponible uniquement dans cet onglet.'
            : 'Votre progression dans les leçons est enregistrée sur cet appareil.'}
        </p>
        <span className="path-level-content">{sectionWords.length} mots · {levelProgress.total} {lessonLabel(levelProgress.total)}</span>
        {userId && !progressionAvailable && (
          <p className="path-info-warning" role="status">Le suivi des mots est temporairement indisponible. Les leçons restent accessibles.</p>
        )}
      </section>

      <div className="path-units path-current-unit">
        {activeUnit && (
          <section className="path-unit is-current" aria-labelledby={`${activeUnit.id}-title`}>
            <header className="path-unit-header">
              <div>
                <p className="path-unit-kicker">Unité {activeUnitIndex + 1} · Actuelle</p>
                <h3 id={`${activeUnit.id}-title`}>{activeUnit.title}</h3>
              </div>
              <span>
                {progressReady ? formatLessonCompletion(activeUnitCompleted, activeUnit.lessons.length) : `${activeUnit.lessons.length} ${lessonLabel(activeUnit.lessons.length)}`}
              </span>
            </header>
            {renderLessonList(activeUnit.lessons)}
          </section>
        )}
      </div>

      <section className="path-program" aria-labelledby="path-program-title">
        <div className="path-section-heading">
          <div>
            <p className="path-section-eyebrow">Programme</p>
            <h3 id="path-program-title">{levelCompleted ? 'Revoir les unités du niveau' : 'Le reste du parcours'}</h3>
          </div>
          {otherUnits.length > 0 && (
            <button type="button" className="path-program-toggle" aria-expanded={allUnitsOpen} aria-controls="path-other-units" onClick={toggleFullProgram}>
              {allUnitsOpen ? 'Réduire le programme' : 'Voir tout le programme'}
            </button>
          )}
        </div>

        <div id="path-other-units" className="path-units path-units-compact">
          {section.units.map((unit, unitIndex) => {
            if (unitIndex === activeUnitIndex) return null
            const isOpen = openUnitIds.has(unit.id)
            const toggleLabel = getUnitToggleLabel(unit.lessons.length, isOpen)

            return (
              <section key={unit.id} className={`path-unit path-unit-compact${unitIndex < activeUnitIndex ? ' is-previous' : ' is-next'}`} aria-labelledby={`${unit.id}-heading`}>
                <h4 id={`${unit.id}-heading`}>
                  <button
                    type="button"
                    className="path-unit-summary"
                    aria-expanded={isOpen}
                    aria-controls={`${unit.id}-lessons`}
                    aria-label={`${toggleLabel} de l’unité ${unitIndex + 1} : ${unit.title}`}
                    onClick={() => toggleUnit(unit.id)}
                  >
                    <span>
                      <small>Unité {unitIndex + 1}</small>
                      <strong>{unit.title}</strong>
                    </span>
                    <span className="path-unit-summary-meta">
                      <span>{unit.lessons.length} {lessonLabel(unit.lessons.length)}</span>
                      <span className="path-unit-summary-action">
                        {toggleLabel}
                        <svg className="path-unit-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>
                      </span>
                    </span>
                  </button>
                </h4>
                <div id={`${unit.id}-lessons`} hidden={!isOpen}>
                  {renderLessonList(unit.lessons)}
                </div>
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
          Explorer les {lexiconWordCount} mots <span aria-hidden="true">→</span>
        </Link>
      </aside>
    </section>
  )
}
