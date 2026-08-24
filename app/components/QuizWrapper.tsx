'use client'

import { useEffect, useState } from 'react'
import Quiz from './Quiz'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

export default function QuizWrapper({ mots }: { mots: Mot[] }) {
  const [modeQuiz, setModeQuiz] = useState(false)

  useEffect(() => {
    if (!modeQuiz) return

    const overflowInitial = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflowInitial
    }
  }, [modeQuiz])

  if (modeQuiz) {
    return (
      <div
        className="quiz-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Quiz Dendi-Learn"
      >
        <div className="quiz-overlay-inner">
          <button
            type="button"
            onClick={() => setModeQuiz(false)}
            className="quiz-close-button"
            aria-label="Fermer le quiz"
            autoFocus
          >
            <span aria-hidden="true">←</span> Fermer
          </button>
          <Quiz mots={mots} onQuitter={() => setModeQuiz(false)} />
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setModeQuiz(true)}
      className="quiz-launch-button"
    >
      Mode Quiz
    </button>
  )
}
