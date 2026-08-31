'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { CurriculumLesson, CurriculumMot } from '@/lib/curriculum'
import SoundToggle from './SoundToggle'
import { useSoundFeedback } from './SoundProvider'

type LessonPhase = 'intro' | 'learn' | 'practice' | 'test' | 'review' | 'result'
type ExerciseType = 'dendi-fr' | 'fr-dendi' | 'phonetic-fr'
type ExerciseMode = 'practice' | 'test'

type Exercise = {
  mot: CurriculumMot
  type: ExerciseType
  prompt: string
  instruction: string
  detail?: string
  correctAnswer: string
  options: string[]
}

const RESUME_KEY = 'dendi-guided-resume'
const LEVEL_KEY = 'dendi-guided-level'

const PHASE_LABELS: Array<{ id: Exclude<LessonPhase, 'intro' | 'result'>; label: string }> = [
  { id: 'learn', label: 'Apprendre' },
  { id: 'practice', label: 'Entraînement' },
  { id: 'test', label: 'Test' },
  { id: 'review', label: 'Révision' },
]

const CORRECT_FEEDBACK = ['Exact !', 'Bien joué !', 'Oui !', 'Continuez comme ça.']
const PRACTICE_INCORRECT_FEEDBACK = [
  'Pas encore — voici la bonne réponse :',
  'Presque — retenons plutôt :',
  'Regardons la bonne réponse :',
]
const TEST_INCORRECT_FEEDBACK = [
  'Pas tout à fait — bonne réponse :',
  'Presque — la bonne réponse est :',
  'À retenir :',
]

function stableHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function deterministicOptions(pool: string[], correctAnswer: string, seed: string, maximum: number) {
  const uniquePool = Array.from(new Set(pool.filter(Boolean)))
  const distractors = uniquePool
    .filter((value) => value !== correctAnswer)
    .sort((a, b) => stableHash(`${seed}-${a}`) - stableHash(`${seed}-${b}`))
    .slice(0, Math.max(0, maximum - 1))

  return [correctAnswer, ...distractors]
    .sort((a, b) => stableHash(`${seed}-position-${a}`) - stableHash(`${seed}-position-${b}`))
}

function selectEvenly<T>(items: T[], count: number) {
  if (count >= items.length) return [...items]
  if (count <= 1) return items.slice(0, count)

  return Array.from({ length: count }, (_, index) => {
    const itemIndex = Math.round((index * (items.length - 1)) / (count - 1))
    return items[itemIndex]
  })
}

function createExercise(
  lesson: CurriculumLesson,
  mot: CurriculumMot,
  questionIndex: number,
  mode: ExerciseMode,
): Exercise {
  const type: ExerciseType = questionIndex % 3 === 0
    ? 'dendi-fr'
    : questionIndex % 3 === 1
      ? 'fr-dendi'
      : 'phonetic-fr'
  const seed = `${lesson.id}-${mode}-${mot.id}-${type}`
  const maximumOptions = mode === 'practice' ? 3 : 4

  if (type === 'fr-dendi') {
    return {
      mot,
      type,
      prompt: mot.fr,
      instruction: 'Quelle est la forme Dendi ?',
      correctAnswer: mot.dendi,
      options: deterministicOptions(lesson.mots.map((item) => item.dendi), mot.dendi, seed, maximumOptions),
    }
  }

  if (type === 'phonetic-fr') {
    return {
      mot,
      type,
      prompt: mot.phonetique,
      instruction: 'Quelle traduction correspond à cette prononciation ?',
      detail: 'Phonétique',
      correctAnswer: mot.fr,
      options: deterministicOptions(lesson.mots.map((item) => item.fr), mot.fr, seed, maximumOptions),
    }
  }

  return {
    mot,
    type,
    prompt: mot.dendi,
    instruction: 'Que signifie ce mot en Dendi ?',
    detail: mode === 'practice' ? mot.phonetique : undefined,
    correctAnswer: mot.fr,
    options: deterministicOptions(lesson.mots.map((item) => item.fr), mot.fr, seed, maximumOptions),
  }
}

export function createLessonExercises(lesson: CurriculumLesson) {
  const practiceCount = Math.min(4, Math.max(2, Math.ceil(lesson.mots.length / 2)))
  const testCount = Math.min(6, lesson.mots.length)
  const practiceMots = selectEvenly(lesson.mots, practiceCount)
  const testMots = selectEvenly(lesson.mots, testCount)

  return {
    practice: practiceMots.map((mot, index) => createExercise(lesson, mot, index, 'practice')),
    test: testMots.map((mot, index) => createExercise(lesson, mot, index, 'test')),
  }
}

function storeResume(lessonId: string, niveau: string) {
  try {
    window.localStorage.setItem(RESUME_KEY, lessonId)
    window.localStorage.setItem(LEVEL_KEY, niveau)
    window.dispatchEvent(new Event('dendi-guided-resume'))
  } catch {
    // La leçon reste utilisable si le stockage local est indisponible.
  }
}

function PhaseProgress({
  phase,
  current,
  total,
  itemLabel,
}: {
  phase: Exclude<LessonPhase, 'intro' | 'result'>
  current: number
  total: number
  itemLabel: string
}) {
  const label = PHASE_LABELS.find((item) => item.id === phase)?.label ?? phase
  const phaseIndex = PHASE_LABELS.findIndex((item) => item.id === phase)
  return (
    <>
      <ol className="guided-phase-list" aria-label="Étapes de la leçon">
        {PHASE_LABELS.map((item, index) => (
          <li
            key={item.id}
            className={index < phaseIndex ? 'is-past' : item.id === phase ? 'is-current' : undefined}
            aria-current={item.id === phase ? 'step' : undefined}
            aria-label={`${item.label}${index < phaseIndex ? ' terminée' : item.id === phase ? ' en cours' : ' à venir'}`}
          >
            <span>{item.label}</span>
          </li>
        ))}
      </ol>
      <div className="guided-phase-mobile" aria-hidden="true">
        <strong>{label}</strong>
        <span>Étape {phaseIndex + 1} sur {PHASE_LABELS.length}</span>
      </div>
      <div className="guided-phase-segments" aria-hidden="true">
        {PHASE_LABELS.map((item, index) => (
          <span key={item.id} className={index <= phaseIndex ? 'is-active' : undefined} />
        ))}
      </div>
      <div className="guided-progress-copy">
        <span>{itemLabel}</span>
        <strong>{current} / {total}</strong>
      </div>
      <div
        className="guided-progress-track"
        role="progressbar"
        aria-label={`${label} : ${current} sur ${total}`}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
      >
        <div style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </>
  )
}

export default function GuidedLesson({
  lesson,
  nextLesson,
  userId,
}: {
  lesson: CurriculumLesson
  nextLesson: CurriculumLesson | null
  userId: string | null
}) {
  const exercises = useMemo(() => createLessonExercises(lesson), [lesson])
  const [phase, setPhase] = useState<LessonPhase>('intro')
  const [learnIndex, setLearnIndex] = useState(0)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [testIndex, setTestIndex] = useState(0)
  const [reviewIndex, setReviewIndex] = useState(0)
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

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [phase, learnIndex, practiceIndex, testIndex, reviewIndex])

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
    void playSound(answer === currentPractice.correctAnswer ? 'correct' : 'incorrect')
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
    void playSound(answer === currentTest.correctAnswer ? 'correct' : 'incorrect')

    if (answer === currentTest.correctAnswer) {
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
      setReviewIndex((index) => index + 1)
      return
    }

    finishLesson()
  }

  const finishLesson = () => {
    if (lessonFinishedRef.current) return
    lessonFinishedRef.current = true
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
  const translationRevealed = revealedMotIds.includes(lesson.mots[learnIndex].id)
  const scoreRatio = exercises.test.length > 0 ? testScore / exercises.test.length : 0
  const resultMessage = scoreRatio >= 0.8
    ? 'Très belle maîtrise.'
    : scoreRatio >= 0.5
      ? 'Bonne progression.'
      : 'Continuez — les mots difficiles reviendront.'
  const reachesUnitBoundary = !nextLesson || nextLesson.unitId !== lesson.unitId

  return (
    <main className="guided-page">
      <header className="guided-header">
        <Link href={`/parcours?niveau=${lesson.niveau}`} className="guided-exit">
          <span aria-hidden="true">←</span> Quitter
        </Link>
        <div className="guided-header-copy">
          <span>{lesson.unitTitle}</span>
          <strong>Leçon {lesson.index} sur {lesson.totalInUnit}</strong>
        </div>
        <SoundToggle compact />
      </header>

      <div className="guided-shell">
        {phase === 'intro' && (
          <section className="guided-panel guided-intro" aria-labelledby="guided-intro-title">
            <p className="guided-eyebrow">{lesson.unitTitle}</p>
            <h1 id="guided-intro-title">{lesson.title}</h1>
            <p className="guided-lead">
              Prêt ? Découvrez tranquillement les {lesson.mots.length} mots de cette leçon.
            </p>
            <div className="guided-intro-summary" aria-label="Contenu de la leçon">
              <span><strong>{lesson.mots.length}</strong> mots</span>
              <span>Apprendre</span>
              <span>Pratiquer</span>
            </div>
            <button type="button" onClick={startLesson} className="guided-primary-button">
              Commencer la leçon <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {phase === 'learn' && (
          <section className="guided-panel guided-phase-panel is-learn" aria-labelledby="guided-learn-title">
            <PhaseProgress phase="learn" current={learnIndex + 1} total={lesson.mots.length} itemLabel="Mot" />
            <article className="guided-word-card">
              <p className="guided-word-label">Dendi</p>
              <h1 id="guided-learn-title">{lesson.mots[learnIndex].dendi}</h1>
              <p className="guided-word-phonetic">{lesson.mots[learnIndex].phonetique}</p>
              {translationRevealed ? (
                <div className="guided-translation" aria-live="polite">
                  <div className="guided-word-divider" aria-hidden="true" />
                  <p className="guided-word-french">{lesson.mots[learnIndex].fr}</p>
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
            <PhaseProgress phase="practice" current={practiceIndex + 1} total={exercises.practice.length} itemLabel="Question guidée" />
            {practiceIndex === 0 && (
              <div className="guided-phase-intro">
                <strong>S’entraîner</strong>
                <p>Essayons tranquillement de reconnaître les mots que vous venez d’apprendre.</p>
              </div>
            )}
            <article className="guided-question-card">
              <p>{currentPractice.instruction}</p>
              <h1 id="guided-practice-title">{currentPractice.prompt}</h1>
              {currentPractice.detail && <span>{currentPractice.detail}</span>}
            </article>
            <QuestionAnswers
              exercise={currentPractice}
              selectedAnswer={selectedAnswer}
              onAnswer={answerPractice}
              gentle
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
            <PhaseProgress phase="test" current={testIndex + 1} total={exercises.test.length} itemLabel="Question du test" />
            {testIndex === 0 && (
              <div className="guided-phase-intro is-test">
                <strong>Le test commence.</strong>
                <p>Voyons ce que vous avez retenu, sans aide.</p>
              </div>
            )}
            <article className="guided-question-card">
              <p>{currentTest.instruction}</p>
              <h1 id="guided-test-title">{currentTest.prompt}</h1>
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
            <PhaseProgress phase="review" current={reviewIndex + 1} total={reviewWords.length} itemLabel="Mot à revoir" />
            <header className="guided-review-heading">
              <p className="guided-eyebrow">À revoir</p>
              <h1 id="guided-review-title">Test terminé.</h1>
              <p>Revoyons rapidement les mots difficiles.</p>
            </header>
            <article className="guided-word-card guided-review-card">
              <p className="guided-word-label">Dendi</p>
              <h2>{reviewWords[reviewIndex].dendi}</h2>
              <p className="guided-word-phonetic">{reviewWords[reviewIndex].phonetique}</p>
              <div className="guided-word-divider" aria-hidden="true" />
              <p className="guided-word-french">{reviewWords[reviewIndex].fr}</p>
            </article>
            <button type="button" onClick={advanceReview} className="guided-primary-button">
              {reviewIndex + 1 < reviewWords.length ? 'Mot suivant' : 'Terminer'}
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {phase === 'result' && (
          <section className="guided-panel guided-result" aria-labelledby="guided-result-title" aria-live="polite">
            <p className="guided-result-mark" aria-hidden="true">✓</p>
            <p className="guided-eyebrow">Leçon terminée</p>
            <h1 id="guided-result-title">{resultMessage}</h1>
            {testErrorIds.length === 0 && (
              <p className="guided-result-context">Test terminé — aucune révision nécessaire.</p>
            )}
            {reachesUnitBoundary && (
              <p className="guided-unit-complete">
                <span aria-hidden="true">◇</span> Unité {lesson.unitTitle} parcourue
              </p>
            )}
            <div className="guided-score" aria-label={`${testScore} bonnes réponses sur ${exercises.test.length} au test`}>
              <strong>{testScore} / {exercises.test.length}</strong>
              <span>au test</span>
            </div>
            <dl className="guided-result-stats">
              <div><dt>Mots appris</dt><dd>{lesson.mots.length}</dd></div>
              <div><dt>Mots revus</dt><dd>{reviewedIds.length}</dd></div>
            </dl>

            <div className="guided-save-status" role="status">
              {!userId && <p>Créez un compte pour conserver votre progression.</p>}
              {userId && pendingWrites > 0 && <p>Synchronisation de la progression…</p>}
              {userId && pendingWrites === 0 && saveIssue && (
                <p className="is-error">Une partie de la progression n’a pas pu être enregistrée.</p>
              )}
              {userId && pendingWrites === 0 && !saveIssue && savedWrites > 0 && (
                <p className="is-saved">Progression enregistrée.</p>
              )}
            </div>

            <div className="guided-result-actions">
              <Link
                href={nextLesson ? `/parcours/${nextLesson.id}` : `/parcours?niveau=${lesson.niveau}`}
                className="guided-primary-link"
              >
                {nextLabel} <span aria-hidden="true">→</span>
              </Link>
              {nextLesson && (
                <Link href={`/parcours?niveau=${lesson.niveau}`} className="guided-secondary-link">
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

function QuestionAnswers({
  exercise,
  selectedAnswer,
  onAnswer,
  gentle = false,
}: {
  exercise: Exercise
  selectedAnswer: string | null
  onAnswer: (answer: string) => void
  gentle?: boolean
}) {
  const answerIsCorrect = selectedAnswer === exercise.correctAnswer
  const feedbackIndex = stableHash(`${exercise.mot.id}-${exercise.type}-${gentle ? 'practice' : 'test'}`)
  const correctFeedback = CORRECT_FEEDBACK[feedbackIndex % CORRECT_FEEDBACK.length]
  const incorrectFeedbacks = gentle ? PRACTICE_INCORRECT_FEEDBACK : TEST_INCORRECT_FEEDBACK
  const incorrectFeedback = incorrectFeedbacks[feedbackIndex % incorrectFeedbacks.length]

  return (
    <>
      <div className="guided-answer-list" aria-label="Propositions de réponse">
        {exercise.options.map((option) => {
          const isCorrect = Boolean(selectedAnswer) && option === exercise.correctAnswer
          const isIncorrect = Boolean(selectedAnswer) && option === selectedAnswer && !isCorrect

          return (
            <button
              key={option}
              type="button"
              onClick={() => onAnswer(option)}
              aria-disabled={Boolean(selectedAnswer)}
              className={`guided-answer${isCorrect ? ' is-correct' : ''}${isIncorrect ? ' is-incorrect' : ''}`}
            >
              <span>{option}</span>
              {isCorrect && <strong><span aria-hidden="true">✓</span> Correct</strong>}
              {isIncorrect && <strong><span aria-hidden="true">✕</span> Votre réponse</strong>}
            </button>
          )
        })}
      </div>
      <div className="guided-feedback" aria-live="polite">
        {selectedAnswer && (
          answerIsCorrect
            ? <p className="is-correct"><span aria-hidden="true">✓</span> {correctFeedback}</p>
            : (
              <p className="is-incorrect">
                <span aria-hidden="true">✕</span> {incorrectFeedback} <strong>{exercise.correctAnswer}</strong>.
              </p>
            )
        )}
      </div>
    </>
  )
}
