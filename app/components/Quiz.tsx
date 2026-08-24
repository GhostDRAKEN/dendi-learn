'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

type Question = {
  mot: Mot
  propositions: string[]
  bonneReponse: string
}

type StatutSauvegarde = 'idle' | 'saving' | 'saved' | 'error' | 'anonymous'

const CATEGORIES_LABELS: Record<string, string> = {
  'Tous': 'Tous les mots',
  'Salutations': 'Salutations',
  'corps': 'Corps humain',
  'verbes': 'Verbes',
  'prepositions': 'Prépositions',
  'noms': 'Noms & Adjectifs',
  'couleurs': 'Couleurs',
  'temps__journee': 'Temps - Journée',
  'temps__repere': 'Temps - Repères',
  'temps__semaine': 'Temps - Semaine',
  'temps__mois': 'Temps - Mois',
}

function genererQuestions(mots: Mot[], motsVus: Set<number>): Question[] {
  // Prioriser les mots non vus
  const nonVus = mots.filter(m => !motsVus.has(m.id))
  const vus = mots.filter(m => motsVus.has(m.id))
  const priorites = [...nonVus.sort(() => Math.random() - 0.5), ...vus.sort(() => Math.random() - 0.5)]
  const selection = priorites.slice(0, 10)

  return selection.map((mot) => {
    const mauvaises = mots
      .filter((m) => m.id !== mot.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((m) => m.fr)
    const propositions = [...mauvaises, mot.fr].sort(() => Math.random() - 0.5)
    return { mot, propositions, bonneReponse: mot.fr }
  })
}

export default function Quiz({ mots, onQuitter }: { mots: Mot[], onQuitter: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [termine, setTermine] = useState(false)
  const [categorieActive, setCategorieActive] = useState('Tous')
  const [phase, setPhase] = useState<'choix' | 'quiz'>('choix')
  const [userId, setUserId] = useState<string | null>(null)
  const [motsVus, setMotsVus] = useState<Set<number>>(new Set())
  const [statutSauvegarde, setStatutSauvegarde] = useState<StatutSauvegarde>('idle')
  const [sauvegardesReussies, setSauvegardesReussies] = useState(0)
  const [sauvegardesEchouees, setSauvegardesEchouees] = useState(0)
  const authRequestRef = useRef<Promise<string | null> | null>(null)

  useEffect(() => {
    authRequestRef.current = supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return null
      setUserId(user.id)
      const { data: progression } = await supabase
        .from('progression')
        .select('mot_id')
        .eq('user_id', user.id)
        .eq('vu', true)
      if (progression) setMotsVus(new Set(progression.map(p => p.mot_id as number)))

      return user.id
    }).catch(() => null)
  }, [])

  useEffect(() => {
    document.querySelector<HTMLElement>('.quiz-overlay')?.scrollTo({ top: 0 })
  }, [phase, index, termine])

  const categories = ['Tous', ...Array.from(new Set(mots.map(m => m.categorie)))]

  const motsFiltres = categorieActive === 'Tous'
    ? mots
    : mots.filter(m => m.categorie === categorieActive)

  const demarrerQuiz = () => {
    if (motsFiltres.length < 4) return
    setQuestions(genererQuestions(motsFiltres, motsVus))
    setIndex(0)
    setSelected(null)
    setScore(0)
    setTermine(false)
    setStatutSauvegarde('idle')
    setSauvegardesReussies(0)
    setSauvegardesEchouees(0)
    setPhase('quiz')
  }

  const handleReponse = async (reponse: string) => {
    if (selected) return
    setSelected(reponse)
    setStatutSauvegarde('idle')
    const correct = reponse === questions[index].bonneReponse
    if (correct) {
      setScore(s => s + 1)

      const utilisateurId = userId ?? await authRequestRef.current
      if (utilisateurId) {
        setStatutSauvegarde('saving')
        try {
          const { error } = await supabase.from('progression').upsert({
            user_id: utilisateurId,
            mot_id: questions[index].mot.id,
            vu: true,
            maitrise: true,
          }, { onConflict: 'user_id,mot_id' })

          if (error) {
            setStatutSauvegarde('error')
            setSauvegardesEchouees(nombre => nombre + 1)
          } else {
            setStatutSauvegarde('saved')
            setSauvegardesReussies(nombre => nombre + 1)
          }
        } catch {
          setStatutSauvegarde('error')
          setSauvegardesEchouees(nombre => nombre + 1)
        }
      } else {
        setStatutSauvegarde('anonymous')
      }
    }
    setTimeout(() => {
      if (index + 1 >= questions.length) {
        setTermine(true)
      } else {
        setIndex(i => i + 1)
        setSelected(null)
        setStatutSauvegarde('idle')
      }
    }, 1000)
  }

  // Phase choix de catégorie
  if (phase === 'choix') {
    return (
      <section className="quiz-panel quiz-category-panel" aria-labelledby="quiz-category-title">
        <header className="quiz-section-header">
          <p className="quiz-eyebrow">Session d’apprentissage</p>
          <h2 id="quiz-category-title" className="quiz-title">Choisissez votre catégorie</h2>
          <p className="quiz-description">
            Sélectionnez le vocabulaire à réviser. Chaque session contient jusqu’à 10 questions.
          </p>
        </header>

        <div className="quiz-category-grid" role="group" aria-label="Catégorie du quiz">
          {categories.map(cat => {
            const nombreMots = (cat === 'Tous' ? mots : mots.filter(m => m.categorie === cat)).length

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategorieActive(cat)}
                className={`quiz-category-button${categorieActive === cat ? ' is-active' : ''}`}
                aria-pressed={categorieActive === cat}
              >
                <span className="quiz-category-name">{CATEGORIES_LABELS[cat] ?? cat}</span>
                <span className="quiz-category-size">{nombreMots} mots</span>
                {categorieActive === cat && <span className="quiz-category-check" aria-hidden="true">✓</span>}
              </button>
            )
          })}
        </div>

        {motsFiltres.length < 4 && (
          <p className="quiz-category-warning" role="status">
            Cette catégorie ne contient pas assez de mots pour créer quatre propositions.
          </p>
        )}

        <div className="quiz-actions">
          <button
            type="button"
            onClick={demarrerQuiz}
            disabled={motsFiltres.length < 4}
            className="quiz-button quiz-button-primary"
          >
            Commencer le quiz <span aria-hidden="true">→</span>
          </button>
          <button type="button" onClick={onQuitter} className="quiz-button quiz-button-secondary">
            Annuler
          </button>
        </div>
      </section>
    )
  }

  if (questions.length === 0) return null

  const question = questions[index]
  const progressionQuiz = Math.round(((index + 1) / questions.length) * 100)
  const pourcentageFinal = Math.round((score / questions.length) * 100)

  // Écran résultat
  if (termine) {
    return (
      <section className="quiz-panel quiz-result" aria-labelledby="quiz-result-title" aria-live="polite">
        <p className="quiz-result-icon" aria-hidden="true">
          {score >= 8 ? '🎯' : score >= 5 ? '💪' : '📚'}
        </p>
        <p className="quiz-eyebrow">Session terminée</p>
        <h2 id="quiz-result-title" className="quiz-result-title">
          {score >= 8 ? 'Excellent résultat !' : score >= 5 ? 'Bon travail !' : 'Continuez à pratiquer !'}
        </h2>
        <div className="quiz-score-summary" aria-label={`${score} bonnes réponses sur ${questions.length}, soit ${pourcentageFinal} pour cent`}>
          <strong>{score} / {questions.length}</strong>
          <span>{pourcentageFinal}% de bonnes réponses</span>
        </div>
        <div className="quiz-session-save-status">
          {!userId && score > 0 && (
            <p className="is-anonymous">Connectez-vous pour enregistrer votre progression.</p>
          )}
          {userId && sauvegardesReussies > 0 && (
            <p className="is-saved">
              {sauvegardesReussies} maîtrise{sauvegardesReussies > 1 ? 's' : ''} enregistrée{sauvegardesReussies > 1 ? 's' : ''}.
            </p>
          )}
          {userId && sauvegardesEchouees > 0 && (
            <p className="is-error">
              {sauvegardesEchouees === 1
                ? 'Une progression n’a pas pu être enregistrée.'
                : `${sauvegardesEchouees} progressions n’ont pas pu être enregistrées.`}
            </p>
          )}
        </div>
        <div className="quiz-actions quiz-result-actions">
          <button type="button" onClick={demarrerQuiz} className="quiz-button quiz-button-primary">
            Rejouer
          </button>
          <button type="button" onClick={() => setPhase('choix')} className="quiz-button quiz-button-secondary">
            Changer de catégorie
          </button>
          <button type="button" onClick={onQuitter} className="quiz-button quiz-button-quiet">
            Quitter
          </button>
        </div>
      </section>
    )
  }

  // Quiz
  return (
    <section className="quiz-panel quiz-question-panel" aria-labelledby="quiz-question-title">
      <header className="quiz-status">
        <div className="quiz-status-copy">
          <span>Question {index + 1} sur {questions.length}</span>
          <span className="quiz-current-score">Score : {score}</span>
        </div>
        <div
          className="quiz-progress-track"
          role="progressbar"
          aria-label={`Progression du quiz : question ${index + 1} sur ${questions.length}`}
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-valuenow={index + 1}
        >
          <div className="quiz-progress-value" style={{ width: `${progressionQuiz}%` }} />
        </div>
      </header>

      <article key={question.mot.id} className="quiz-question-card">
        <p className="quiz-question-prompt">
          Que signifie ce mot en Dendi ?
        </p>
        <h2 id="quiz-question-title" className="quiz-question-word">{question.mot.dendi}</h2>
        <p className="quiz-question-phonetic">{question.mot.phonetique}</p>
      </article>

      <div className="quiz-answer-grid" aria-label="Propositions de réponse">
        {question.propositions.map((prop) => {
          const isCorrect = Boolean(selected) && prop === question.bonneReponse
          const isIncorrect = Boolean(selected) && prop === selected && prop !== question.bonneReponse

          return (
            <button
              key={prop}
              type="button"
              onClick={() => handleReponse(prop)}
              className={`quiz-answer${isCorrect ? ' is-correct' : ''}${isIncorrect ? ' is-incorrect' : ''}`}
              aria-disabled={Boolean(selected)}
            >
              <span>{prop}</span>
              {isCorrect && <span className="quiz-answer-status"><span aria-hidden="true">✓</span> Correcte</span>}
              {isIncorrect && <span className="quiz-answer-status"><span aria-hidden="true">✕</span> Votre réponse</span>}
            </button>
          )
        })}
      </div>

      <div className="quiz-feedback" aria-live="polite">
        {selected && (
          selected === question.bonneReponse
            ? <p className="is-correct"><span aria-hidden="true">✓</span> Bonne réponse.</p>
            : <p className="is-incorrect"><span aria-hidden="true">✕</span> Pas tout à fait. La bonne réponse est <strong>{question.bonneReponse}</strong>.</p>
        )}
        {selected && selected === question.bonneReponse && statutSauvegarde !== 'idle' && (
          <div className={`quiz-save-feedback is-${statutSauvegarde}`}>
            {statutSauvegarde === 'saving' && 'Enregistrement de la progression…'}
            {statutSauvegarde === 'saved' && 'Progression enregistrée.'}
            {statutSauvegarde === 'error' && 'La progression n’a pas pu être enregistrée.'}
            {statutSauvegarde === 'anonymous' && 'Connectez-vous pour enregistrer votre progression.'}
          </div>
        )}
      </div>
    </section>
  )
}
