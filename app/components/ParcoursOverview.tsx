'use client'

import Link from 'next/link'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
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
  const levelToggleRef = useRef<HTMLButtonElement>(null)
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
  const isInProgress = lessonToContinue && getRecordedLessonState(records[lessonToContinue.id]) === 'in-progress'
  const levelCompleted = progressReady && !lessonToContinue && levelProgress.total > 0
  const continueLabel = levelCompleted
    ? nextSection ? 'Découvrir le niveau suivant' : 'Explorer le lexique'
    : isInProgress ? 'Repartir du début' : 'Commencer la leçon'
  const continueHref = lessonToContinue
    ? `/parcours/${lessonToContinue.id}`
    : nextSection ? `/parcours?niveau=${nextSection}` : '/apprendre'
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
        const stateLabel = progressReady ? STATUS_LABELS[status] : 'Chargement du suivi'
        const rowClass = `path-lesson is-${status}`
        const copy = (
          <span className="path-lesson-copy">
            <strong>
              {status === 'completed' && (
                <svg className="path-lesson-check" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m4 10 4 4 8-8" /></svg>
              )}
              Leçon {lesson.index}
            </strong>
            <small>{lesson.mots.length} mots <span aria-hidden="true">· </span><span>{stateLabel}</span></small>
          </span>
        )

        if (lesson.id === lessonToContinue?.id) {
          return <div key={lesson.id} className={rowClass}>{copy}</div>
        }

        const action = status === 'completed' ? 'Revoir' : status === 'in-progress' ? 'Repartir du début' : 'Commencer'
        return (
          <Link
            key={lesson.id}
            href={`/parcours/${lesson.id}`}
            className={rowClass}
            aria-label={`Leçon ${lesson.index}, ${lesson.unitTitle}, ${lesson.mots.length} mots. ${stateLabel}. ${action}`}
          >
            {copy}
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

  return (
    <section className="path-content" aria-labelledby="path-title">
      <header className="path-intro">
        <h2 id="path-title" className="path-title">Mon parcours</h2>

        <div className="path-level-picker">
          <div className="path-level-current">
            <span>Niveau <strong>{LEVEL_LABELS[section.id]}</strong></span>
            <button
              ref={levelToggleRef}
              type="button"
              className="path-level-toggle"
              aria-expanded={levelPickerOpen}
              aria-controls="path-level-options"
              onClick={() => setLevelPickerOpen((open) => !open)}
            >
              {levelPickerOpen ? 'Fermer le choix du niveau' : 'Changer de niveau'}
            </button>
          </div>
          <div id="path-level-options" className="path-level-options" role="group" aria-label="Choisir le niveau du parcours" hidden={!levelPickerOpen}>
            {NIVEAUX.map((niveau) => (
              <Link
                key={niveau}
                href={`/parcours?niveau=${niveau}`}
                className={`path-level-link${section.id === niveau ? ' is-active' : ''}`}
                aria-current={section.id === niveau ? 'page' : undefined}
                onNavigate={() => {
                  setLevelPickerOpen(false)
                  levelToggleRef.current?.focus({ preventScroll: true })
                }}
              >
                {LEVEL_LABELS[niveau]}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <article className="path-continue-card">
        <div className="path-continue-copy">
          <p className="path-continue-eyebrow">{levelCompleted ? 'Niveau terminé' : isInProgress ? 'Leçon en cours' : suggestionCopy.heading}</p>
          <h3>
            {lessonToContinue ? lessonToContinue.unitTitle : LEVEL_LABELS[section.id]}
            {lessonToContinue && <span>Leçon {lessonToContinue.index}</span>}
          </h3>
          {lessonToContinue && (
            <p>
              {lessonToContinue.mots.length} mots
              {!isInProgress && (
                <><span aria-hidden="true"> · </span>{progressReady ? STATUS_LABELS[lessonStatus(lessonToContinue)] : 'Chargement du suivi…'}</>
              )}
            </p>
          )}
          {!isInProgress && suggestionCopy.detail && <p className="path-recommendation-note">{suggestionCopy.detail}</p>}
        </div>
        <Link href={continueHref} className="path-primary-action">
          {continueLabel} <span aria-hidden="true">→</span>
        </Link>
      </article>

      <section className="path-level-progress" aria-label={`Progression du niveau ${LEVEL_LABELS[section.id]}`}>
        <div className="path-level-progress-heading">
          <h3>Progression</h3>
          <p id="path-progress-count" className="path-level-progress-count" aria-live="polite">
            {progressReady ? <><strong>{levelProgress.completed} / {levelProgress.total}</strong> leçons terminées</> : 'Chargement du suivi…'}
          </p>
        </div>
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
            : 'Le suivi de vos leçons est conservé dans ce navigateur.'}
        </p>
        {userId && !progressionAvailable && (
          <p className="path-info-warning" role="status">Le suivi des mots est temporairement indisponible. Les leçons restent accessibles.</p>
        )}
      </section>

      <section className="path-program" aria-labelledby="path-program-title">
        <h3 id="path-program-title" className="path-program-title">Programme</h3>
        <div className="path-units">
          {section.units.map((unit, unitIndex) => {
            if (unitIndex === activeUnitIndex) {
              const completed = unit.lessons.filter(lesson => lessonStatus(lesson) === 'completed').length
              return (
                <section key={unit.id} className="path-unit path-current-unit is-current" aria-labelledby={`${unit.id}-title`}>
                  <header className="path-unit-header">
                    <div>
                      <p className="path-unit-kicker">Unité {unitIndex + 1}{!levelCompleted && ' · Actuelle'}</p>
                      <h4 id={`${unit.id}-title`}>{unit.title}</h4>
                    </div>
                    <span>
                      {progressReady ? formatLessonCompletion(completed, unit.lessons.length) : `${unit.lessons.length} ${lessonLabel(unit.lessons.length)}`}
                    </span>
                  </header>
                  {renderLessonList(unit.lessons)}
                </section>
              )
            }
            const isOpen = openUnitIds.has(unit.id)
            const toggleLabel = getUnitToggleLabel(unit.lessons.length, isOpen)

            return (
              <section key={unit.id} className="path-unit" aria-labelledby={`${unit.id}-heading`}>
                <h4 id={`${unit.id}-heading`}>
                  <button
                    type="button"
                    className="path-unit-summary"
                    aria-expanded={isOpen}
                    aria-controls={`${unit.id}-lessons`}
                    aria-label={`Unité ${unitIndex + 1}, ${unit.title}, ${unit.lessons.length} ${lessonLabel(unit.lessons.length)}. ${toggleLabel}`}
                    onClick={() => toggleUnit(unit.id)}
                  >
                    <span>
                      <small>Unité {unitIndex + 1}</small>
                      <strong>{unit.title}</strong>
                    </span>
                    <span className="path-unit-summary-meta">
                      <span>{unit.lessons.length} {lessonLabel(unit.lessons.length)}</span>
                      <svg className="path-unit-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg>
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
