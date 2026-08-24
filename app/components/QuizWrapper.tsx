'use client'

import { useState } from 'react'
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

  if (modeQuiz) {
    return (
      <div style={{
        position: 'fixed', inset: 0, backgroundColor: '#0A0A0A',
        zIndex: 100, overflowY: 'auto',
      }}>
        <div style={{ padding: '24px 5vw' }}>
          <button
            onClick={() => setModeQuiz(false)}
            style={{
              marginBottom: '24px', padding: '8px 16px',
              borderRadius: '9999px', backgroundColor: 'transparent',
              border: '1px solid #3A3A3A', color: '#A89A8A',
              fontSize: '13px', cursor: 'pointer',
              fontFamily: 'Georgia, serif',
            }}
          >
            ← Retour
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
