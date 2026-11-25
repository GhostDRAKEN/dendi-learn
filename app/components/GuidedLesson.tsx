'use client'

import Link from 'next/link'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getLearningLesson, hasLinguisticValue, type CurriculumLesson, type CurriculumMot } from '@/lib/curriculum'
import { createLessonExercises, isCorrectAnswer, type Exercise } from '@/lib/lesson-exercises'
import SoundToggle from './SoundToggle'
import PronunciationButton from './PronunciationButton'
import GuidedIntro from './GuidedIntro'
import { useSoundFeedback } from './SoundProvider'
import { getLessonProgressSnapshot, getRecordedLessonState, parseLessonRecords, recordLessonEvent, subscribeToLessonProgress } from '@/lib/lesson-progress'

type LessonPhase = 'intro' | 'learn' | 'practice' | 'test' | 'review' | 'result'
const RESUME_KEY = 'dendi-guided-resume'
const LEVEL_KEY = 'dendi-guided-level'

const phaseLabels = {
  learn: 'Apprendre',
  practice: 'Entraînement',
  test: 'Test',
  review: 'Révision',
} as const

function storeResume(lessonId: string, niveau: string) {
  try {
    window.localStorage.setItem(RESUME_KEY, lessonId)
    window.localStorage.setItem(LEVEL_KEY, niveau)
    window.dispatchEvent(new Event('dendi-guided-resume'))
  } catch {
    // La leçon reste utilisable si le stockage local est indisponible.
  }
}

function PhaseProgress({ phase, current, total, completed }: {
  phase: keyof typeof phaseLabels
  current: number
  total: number
  completed: number
}) {
  const question = phase === 'practice' || phase === 'test'
  const item = question ? 'Question' : 'Mot'
  const singular = question ? 'réponse donnée' : phase === 'learn' ? 'traduction révélée' : 'mot revu'
  const plural = question ? 'réponses données' : phase === 'learn' ? 'traductions révélées' : 'mots revus'
  return (
    <div className="guided-position">
      <strong id="guided-phase-name">{phaseLabels[phase]}</strong>
      <div>
        <span id="guided-item-position">{item} {current} sur {total}</span>
        <small>{completed} {completed > 1 ? plural : singular}</small>
      </div>
    </div>
  )
}

function UnitCompletion({ ids, title, userId }: { ids: string[]; title: string; userId: string | null }) {
  const snapshot = useSyncExternalStore(subscribeToLessonProgress, () => getLessonProgressSnapshot(userId), () => '')
  const records = parseLessonRecords(snapshot)
  if (!ids.length || !ids.every(id => getRecordedLessonState(records[id]) === 'completed')) return null
  return <p className="guided-unit-complete">Unité terminée · {title}</p>
}

function AvailableGuidedLesson({
  lesson,
  exercises,
  nextLesson,
  userId,
  unitNumber,
  unitLessonIds,
}: {
  lesson: CurriculumLesson
  exercises: ReturnType<typeof createLessonExercises>
  nextLesson: CurriculumLesson | null
  userId: string | null
  unitNumber?: number
  unitLessonIds: string[]
}) {
  const [phase, setPhase] = useState<LessonPhase>('intro')
  const [learnIndex, setLearnIndex] = useState(0)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [testIndex, setTestIndex] = useState(0)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewTranslationRevealed, setReviewTranslationRevealed] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [testScore, setTestScore] = useState(0)
  const [testErrorIds, setTestErrorIds] = useState<number[]>([])
  const [reviewedIds, setReviewedIds] = useState<number[]>([])
  const [revealedMotIds, setRevealedMotIds] = useState<number[]>([])
  const [pendingWrites, setPendingWrites] = useState(0)
  const [savedWrites, setSavedWrites] = useState(0)
  const [saveIssue, setSaveIssue] = useState(false)
  const presentedMotIds = useRef(new Set<number>())
  const answerLockRef = useRef(false)
  const lessonFinishedRef = useRef(false)
  const { playSound } = useSoundFeedback()

  const currentPractice = exercises.practice[practiceIndex]
  const currentTest = exercises.test[testIndex]
  const reviewWords = testErrorIds
    .map((id) => lesson.mots.find((mot) => mot.id === id))
    .filter((mot): mot is CurriculumMot => Boolean(mot))

  useEffect(() => {
    storeResume(lesson.id, lesson.niveau)
  }, [lesson.id, lesson.niveau])

  const shellRef = useRef<HTMLDivElement>(null)
  const screen = [phase, learnIndex, practiceIndex, testIndex, reviewIndex].join('/')
  const previousScreen = useRef(screen)
  const translationRevealed = revealedMotIds.includes(lesson.mots[learnIndex].id)

  useLayoutEffect(() => {
    const changedScreen = previousScreen.current !== screen
    previousScreen.current = screen
    if (!changedScreen && !selectedAnswer && !translationRevealed && !reviewTranslationRevealed) return

    const selector = changedScreen
      ? (phase === 'intro' ? '.guided-primary-button' : '[data-lesson-heading]')
      : '[data-lesson-notice]'
    const target = shellRef.current?.querySelector<HTMLElement>(selector)
    if (!target) return
    if (changedScreen) window.scrollTo({ top: 0, behavior: 'instant' })
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }, [screen, phase, selectedAnswer, translationRevealed, reviewTranslationRevealed])

  const persistProgress = async (motId: number, mastered: boolean) => {
    if (!userId) return

    setPendingWrites((count) => count + 1)
    try {
      const payload: { user_id: string; mot_id: number; vu: boolean; maitrise?: boolean } = {
        user_id: userId,
        mot_id: motId,
        vu: true,
      }
      if (mastered) payload.maitrise = true

      const { error } = await supabase
        .from('progression')
        .upsert(payload, { onConflict: 'user_id,mot_id' })

      if (error) setSaveIssue(true)
      else setSavedWrites((count) => count + 1)
    } catch {
      setSaveIssue(true)
    } finally {
      setPendingWrites((count) => Math.max(0, count - 1))
    }
  }

  const markWordAsPresented = (motId: number) => {
    if (presentedMotIds.current.has(motId)) return
    presentedMotIds.current.add(motId)
    void persistProgress(motId, false)
  }

  const startLesson = () => {
    recordLessonEvent(lesson.id, userId, 'started')
    setPhase('learn')
    markWordAsPresented(lesson.mots[0].id)
  }

  const advanceLearning = () => {
    if (learnIndex + 1 < lesson.mots.length) {
      const nextIndex = learnIndex + 1
      setLearnIndex(nextIndex)
      markWordAsPresented(lesson.mots[nextIndex].id)
      return
    }

    void playSound('phase-complete')
    setPhase('practice')
  }

  const goBackLearning = () => {
    setLearnIndex((index) => Math.max(0, index - 1))
  }

  const revealTranslation = () => {
    const motId = lesson.mots[learnIndex].id
    setRevealedMotIds((ids) => ids.includes(motId) ? ids : [...ids, motId])
  }

  const answerPractice = (answer: string) => {
    if (selectedAnswer || answerLockRef.current || !currentPractice) return
    answerLockRef.current = true
    setSelectedAnswer(answer)
    void playSound(isCorrectAnswer(currentPractice, answer) ? 'correct' : 'incorrect')
  }

  const advancePractice = () => {
    if (!selectedAnswer) return
    answerLockRef.current = false
    if (practiceIndex + 1 < exercises.practice.length) {
      setPracticeIndex((index) => index + 1)
      setSelectedAnswer(null)
      return
    }

    void playSound('phase-complete')
    setSelectedAnswer(null)
    setPhase('test')
  }

  const answerTest = (answer: string) => {
    if (selectedAnswer || answerLockRef.current || !currentTest) return
    answerLockRef.current = true
    setSelectedAnswer(answer)
    const correct = isCorrectAnswer(currentTest, answer)
    void playSound(correct ? 'correct' : 'incorrect')

    if (correct) {
      setTestScore((score) => score + 1)
      void persistProgress(currentTest.mot.id, true)
    } else {
      setTestErrorIds((ids) => ids.includes(currentTest.mot.id) ? ids : [...ids, currentTest.mot.id])
    }
  }

  const advanceTest = () => {
    if (!selectedAnswer) return
    answerLockRef.current = false
    if (testIndex + 1 < exercises.test.length) {
      setTestIndex((index) => index + 1)
      setSelectedAnswer(null)
      return
    }

    setSelectedAnswer(null)
    if (testErrorIds.length > 0) {
      void playSound('phase-complete')
      setPhase('review')
    } else finishLesson()
  }

  const advanceReview = () => {
    const currentWord = reviewWords[reviewIndex]
    if (currentWord) {
      setReviewedIds((ids) => ids.includes(currentWord.id) ? ids : [...ids, currentWord.id])
    }

    if (reviewIndex + 1 < reviewWords.length) {
      setReviewTranslationRevealed(false)
      setReviewIndex((index) => index + 1)
      return
    }

    finishLesson()
  }

  const finishLesson = () => {
    if (lessonFinishedRef.current) return
    lessonFinishedRef.current = true
    recordLessonEvent(lesson.id, userId, 'completed')
    void playSound('lesson-complete')
    setPhase('result')
    storeResume(nextLesson?.id ?? lesson.id, nextLesson?.niveau ?? lesson.niveau)
  }

  const restartLesson = () => {
    setPhase('intro')
    setLearnIndex(0)
    setPracticeIndex(0)
    setTestIndex(0)
    setReviewIndex(0)
    setReviewTranslationRevealed(false)
    setSelectedAnswer(null)
    setTestScore(0)
    setTestErrorIds([])
    setReviewedIds([])
    setRevealedMotIds([])
    setSavedWrites(0)
    setSaveIssue(false)
    answerLockRef.current = false
    lessonFinishedRef.current = false
    presentedMotIds.current.clear()
    storeResume(lesson.id, lesson.niveau)
  }

  const nextLabel = nextLesson
    ? nextLesson.unitId === lesson.unitId
      ? `Continuer avec ${nextLesson.title}`
      : `Continuer vers ${nextLesson.unitTitle}`
    : 'Retour au parcours'
  return (
    <main className={phase === 'intro' ? 'guided-page guided-page-intro' : 'guided-page'}>
      <header className="guided-header">
        <Link href={`/parcours?niveau=${lesson.niveau}`} className="guided-exit">
          <span aria-hidden="true">←</span> Quitter
        </Link>
        <div className="guided-header-copy">
          {phase !== 'intro' && <span>{lesson.unitTitle}</span>}
          <strong>Leçon {lesson.index} sur {lesson.totalInUnit}</strong>
        </div>
        <SoundToggle compact />
      </header>

      <div className="guided-shell" ref={shellRef}>
        {phase === 'intro' && <GuidedIntro lesson={lesson} unitNumber={unitNumber} onStart={startLesson} />}

        {phase === 'learn' && (
          <section className="guided-panel guided-phase-panel is-learn" aria-labelledby="guided-learn-title">
            <PhaseProgress phase="learn" current={learnIndex + 1} total={lesson.mots.length} completed={revealedMotIds.length} />
            <article className="guided-word-card">
              <p className="guided-word-label">Dendi</p>
              <h1 id="guided-learn-title" aria-describedby="guided-phase-name guided-item-position" data-lesson-heading tabIndex={-1}>{lesson.mots[learnIndex].dendi}</h1>
              {hasLinguisticValue(lesson.mots[learnIndex].phonetique) && <p className="guided-word-phonetic">{lesson.mots[learnIndex].phonetique}</p>}
              <PronunciationButton wordId={lesson.mots[learnIndex].id} word={lesson.mots[learnIndex].dendi} />
              {!translationRevealed && <p className="guided-recall-prompt">Essayez de retrouver le sens avant de révéler la traduction.</p>}
              {translationRevealed ? (
                <div className="guided-translation">
                  <div className="guided-word-divider" aria-hidden="true" />
                  <p className="guided-word-french" data-lesson-notice tabIndex={-1}>{lesson.mots[learnIndex].fr}</p>
                </div>
              ) : (
                <button type="button" onClick={revealTranslation} className="guided-reveal-button">
                  Voir la traduction
                </button>
              )}
            </article>
            {translationRevealed && learnIndex + 1 === lesson.mots.length && (
              <div className="guided-transition-note">
                <strong>Les mots sont en place.</strong>
                <span>Maintenant, entraînons-nous.</span>
              </div>
            )}
            <div className="guided-learn-actions">
              {learnIndex > 0 && (
                <button type="button" onClick={goBackLearning} className="guided-back-button">
                  <span aria-hidden="true">←</span> Précédent
                </button>
              )}
              {translationRevealed && (
                <button type="button" onClick={advanceLearning} className="guided-primary-button">
                  {learnIndex + 1 < lesson.mots.length ? 'Continuer' : 'S’entraîner'}
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </section>
        )}

        {phase === 'practice' && currentPractice && (
          <section className="guided-panel guided-phase-panel is-practice" aria-labelledby="guided-practice-title">
            <PhaseProgress phase="practice" current={practiceIndex + 1} total={exercises.practice.length} completed={practiceIndex + Number(selectedAnswer !== null)} />
            {practiceIndex === 0 && (
              <div className="guided-phase-intro">
                <strong>S’entraîner</strong>
                <p>Essayons tranquillement de reconnaître les mots que vous venez d’apprendre.</p>
              </div>
            )}
            <article className="guided-question-card">
              <p id="guided-practice-instruction">{currentPractice.instruction}</p>
              <h1 id="guided-practice-title" data-lesson-heading tabIndex={-1} aria-describedby="guided-phase-name guided-item-position guided-practice-instruction">{currentPractice.prompt}</h1>
              {currentPractice.detail && <span>{currentPractice.detail}</span>}
            </article>
            <QuestionAnswers
              exercise={currentPractice}
              selectedAnswer={selectedAnswer}
              onAnswer={answerPractice}
            />
            {selectedAnswer && practiceIndex + 1 === exercises.practice.length && (
              <div className="guided-transition-note is-test">
                <strong>Bien.</strong>
                <span>Vous êtes prêt pour le test.</span>
              </div>
            )}
            {selectedAnswer && (
              <button type="button" onClick={advancePractice} className="guided-primary-button">
                {practiceIndex + 1 < exercises.practice.length ? 'Continuer' : 'Commencer le test'}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </section>
        )}

        {phase === 'test' && currentTest && (
          <section className="guided-panel guided-phase-panel is-test" aria-labelledby="guided-test-title">
            <PhaseProgress phase="test" current={testIndex + 1} total={exercises.test.length} completed={testIndex + Number(selectedAnswer !== null)} />
            {testIndex === 0 && (
              <div className="guided-phase-intro is-test">
                <strong>Le test commence.</strong>
                <p>Répondez sans aide. Vous reverrez ensuite les mots du test en cas d’erreur.</p>
              </div>
            )}
            <article className="guided-question-card">
              <p id="guided-test-instruction">{currentTest.instruction}</p>
              <h1 id="guided-test-title" data-lesson-heading tabIndex={-1} aria-describedby="guided-phase-name guided-item-position guided-test-instruction">{currentTest.prompt}</h1>
              {currentTest.detail && <span>{currentTest.detail}</span>}
            </article>
            <QuestionAnswers exercise={currentTest} selectedAnswer={selectedAnswer} onAnswer={answerTest} />
            {selectedAnswer && testIndex + 1 === exercises.test.length && (
              <div className="guided-transition-note is-test">
                <strong>Test terminé.</strong>
                <span>
                  {testErrorIds.length > 0
                    ? 'Revoyons rapidement les mots difficiles.'
                    : 'Très bien — aucune révision nécessaire.'}
                </span>
              </div>
            )}
            {selectedAnswer && (
              <button type="button" onClick={advanceTest} className="guided-primary-button">
                {testIndex + 1 < exercises.test.length
                  ? 'Continuer'
                  : testErrorIds.length > 0 ? 'Revoir mes erreurs' : 'Voir mon résultat'}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </section>
        )}

        {phase === 'review' && reviewWords[reviewIndex] && (
          <section className="guided-panel guided-phase-panel is-review" aria-labelledby="guided-review-title">
            <PhaseProgress phase="review" current={reviewIndex + 1} total={reviewWords.length} completed={reviewedIds.length} />
            <header className="guided-review-heading">
              <p className="guided-eyebrow">À revoir</p>
              <h1 id="guided-review-title">Test terminé.</h1>
              <p>Ces mots ont posé difficulté au test.</p>
            </header>
            <article className="guided-word-card guided-review-card">
              <p className="guided-word-label">Dendi</p>
              <h2 aria-describedby="guided-phase-name guided-item-position" data-lesson-heading tabIndex={-1}>{reviewWords[reviewIndex].dendi}</h2>
              {hasLinguisticValue(reviewWords[reviewIndex].phonetique) && <p className="guided-word-phonetic">{reviewWords[reviewIndex].phonetique}</p>}
              <PronunciationButton wordId={reviewWords[reviewIndex].id} word={reviewWords[reviewIndex].dendi} />
              {!reviewTranslationRevealed && <p className="guided-recall-prompt">Essayez de retrouver le sens avant de révéler la traduction.</p>}
              {reviewTranslationRevealed ? (
                <div className="guided-translation">
                  <div className="guided-word-divider" aria-hidden="true" />
                  <p className="guided-word-french" data-lesson-notice tabIndex={-1}>{reviewWords[reviewIndex].fr}</p>
                </div>
              ) : (
                <button type="button" onClick={() => setReviewTranslationRevealed(true)} className="guided-reveal-button">
                  Voir la traduction
                </button>
              )}
            </article>
            {reviewTranslationRevealed && (
              <button type="button" onClick={advanceReview} className="guided-primary-button">
                {reviewIndex + 1 < reviewWords.length ? 'Mot suivant' : 'Terminer'}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </section>
        )}

        {phase === 'result' && (
          <section className="guided-panel guided-result" aria-labelledby="guided-result-title">
            <p className="guided-result-mark" aria-hidden="true">✓</p>
            <h1 id="guided-result-title" data-lesson-heading tabIndex={-1} aria-describedby="guided-test-score">Leçon terminée</h1>
            <p id="guided-test-score" className="guided-score">
              <strong>{testScore === 0 ? 'Aucune bonne réponse' : `${testScore} bonne${testScore > 1 ? 's' : ''} réponse${testScore > 1 ? 's' : ''}`} sur {exercises.test.length}</strong>
              <span>au test</span>
            </p>
            <p className="guided-result-context">
              {testErrorIds.length === 0 ? 'Toutes les réponses sont correctes. Aucune révision nécessaire.' : 'Révision effectuée.'}
            </p>
            <UnitCompletion ids={unitLessonIds} title={lesson.unitTitle} userId={userId} />
            <dl className="guided-result-stats">
              <div><dt>Mots parcourus</dt><dd>{lesson.mots.length}</dd></div>
              <div><dt>Mots revus</dt><dd>{reviewedIds.length}</dd></div>
            </dl>

            <div className="guided-save-status" role="status">
              {userId && pendingWrites > 0 && <p>Enregistrement des mots sur votre compte…</p>}
              {userId && pendingWrites === 0 && saveIssue && (
                <p className="is-error">Certains mots n’ont pas pu être enregistrés sur votre compte.</p>
              )}
              {userId && pendingWrites === 0 && !saveIssue && savedWrites > 0 && (
                <p className="is-saved">Mots enregistrés sur votre compte.</p>
              )}
            </div>

            <div className="guided-result-actions">
              <Link
                href={nextLesson ? `/parcours/${nextLesson.id}` : `/parcours?niveau=${lesson.niveau}#path-title`}
                className="guided-primary-link"
              >
                {nextLabel} <span aria-hidden="true">→</span>
              </Link>
              {nextLesson && (
                <Link href={`/parcours?niveau=${lesson.niveau}#path-title`} className="guided-secondary-link">
                  Retour au parcours
                </Link>
              )}
              <button type="button" onClick={restartLesson} className="guided-quiet-button">
                Revoir cette leçon
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default function GuidedLesson(props: {
  lesson: CurriculumLesson
  nextLesson: CurriculumLesson | null
  userId: string | null
  unitNumber?: number
  unitLessonIds: string[]
}) {
  const lesson = useMemo(() => getLearningLesson(props.lesson), [props.lesson])
  const exercises = useMemo(() => createLessonExercises(lesson), [lesson])
  if (exercises.test.length === 0) {
    return (
      <main className="guided-page">
        <section className="guided-load-error" role="status">
          <h1>Leçon momentanément indisponible</h1>
          <p>Le contenu de cette leçon doit être vérifié avant de pouvoir être proposé.</p>
          <Link href={`/parcours?niveau=${lesson.niveau}`} className="guided-secondary-link">Retour au parcours</Link>
        </section>
      </main>
    )
  }
  return <AvailableGuidedLesson {...props} lesson={lesson} exercises={exercises} />
}

function QuestionAnswers({
  exercise,
  selectedAnswer,
  onAnswer,
}: {
  exercise: Exercise
  selectedAnswer: string | null
  onAnswer: (answer: string) => void
}) {
  const answerIsCorrect = selectedAnswer !== null && isCorrectAnswer(exercise, selectedAnswer)

  return (
    <>
      <div className="guided-answer-list" aria-label="Propositions de réponse">
        {exercise.options.map((option) => {
          const isCorrect = Boolean(selectedAnswer) && isCorrectAnswer(exercise, option)
          const isIncorrect = Boolean(selectedAnswer) && option === selectedAnswer && !isCorrect

          return (
            <button
              key={option}
              type="button"
              onClick={() => onAnswer(option)}
              disabled={selectedAnswer !== null}
              className={`guided-answer${isCorrect ? ' is-correct' : ''}${isIncorrect ? ' is-incorrect' : ''}`}
            >
              <span>{option}</span>
              {isCorrect && <strong><span aria-hidden="true">✓</span> Correct</strong>}
              {isIncorrect && <strong><span aria-hidden="true">✕</span> Votre réponse</strong>}
            </button>
          )
        })}
      </div>
      <div className="guided-feedback">
        {selectedAnswer && (
          answerIsCorrect
            ? <p className="is-correct" data-lesson-notice tabIndex={-1}><span aria-hidden="true">✓</span> Réponse correcte : <strong>{exercise.correctAnswer}</strong></p>
            : (
              <p className="is-incorrect" data-lesson-notice tabIndex={-1}>
                <span>Votre réponse : {selectedAnswer}</span>
                <span>Réponse attendue : <strong>{exercise.correctAnswer}</strong></span>
              </p>
            )
        )}
      </div>
    </>
  )
}
