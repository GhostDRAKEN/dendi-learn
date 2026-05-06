'use client'

import { useState, useEffect } from 'react'

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

function genererQuestions(mots: Mot[]): Question[] {
  const melange = [...mots].sort(() => Math.random() - 0.5)
  return melange.slice(0, 10).map((mot) => {
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

  useEffect(() => {
    setQuestions(genererQuestions(mots))
  }, [mots])

  if (questions.length === 0) return null

  const question = questions[index]

  const handleReponse = (reponse: string) => {
    if (selected) return
    setSelected(reponse)
    if (reponse === question.bonneReponse) setScore(score + 1)

    setTimeout(() => {
      if (index + 1 >= questions.length) {
        setTermine(true)
      } else {
        setIndex(index + 1)
        setSelected(null)
      }
    }, 1000)
  }

  if (termine) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>
          {score >= 8 ? '🎯' : score >= 5 ? '💪' : '📚'}
        </p>
        <h2 style={{ fontSize: '28px', color: '#F5F0EB', marginBottom: '8px' }}>
          {score} / {questions.length}
        </h2>
        <p style={{ color: '#A89A8A', marginBottom: '40px' }}>
          {score >= 8 ? 'Excellent !' : score >= 5 ? 'Bien joué !' : 'Continue à pratiquer !'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setQuestions(genererQuestions(mots))
              setIndex(0)
              setSelected(null)
              setScore(0)
              setTermine(false)
            }}
            style={{
              padding: '12px 24px', borderRadius: '9999px',
              backgroundColor: '#E07B39', border: 'none',
              color: 'white', fontSize: '14px', cursor: 'pointer',
              fontFamily: 'Georgia, serif',
            }}
          >
            Rejouer
          </button>
          <button
            onClick={onQuitter}
            style={{
              padding: '12px 24px', borderRadius: '9999px',
              backgroundColor: 'transparent', border: '1px solid #3A3A3A',
              color: '#A89A8A', fontSize: '14px', cursor: 'pointer',
              fontFamily: 'Georgia, serif',
            }}
          >
            Quitter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      {/* Progression quiz */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <span style={{ color: '#A89A8A', fontSize: '13px' }}>
          Question {index + 1} / {questions.length}
        </span>
        <span style={{ color: '#E07B39', fontSize: '13px' }}>
          Score : {score}
        </span>
      </div>

      {/* Mot à deviner */}
      <div style={{
        backgroundColor: '#161616', border: '1px solid #2A2A2A',
        borderRadius: '16px', padding: '40px 24px',
        textAlign: 'center', marginBottom: '24px',
      }}>
        <p style={{ fontSize: '11px', letterSpacing: '2px', color: '#555', marginBottom: '12px', textTransform: 'uppercase' }}>
          Que signifie ce mot en Dendi ?
        </p>
        <p style={{ fontSize: '32px', fontWeight: '700', color: '#E07B39' }}>
          {question.mot.dendi}
        </p>
        <p style={{ fontSize: '14px', color: '#A89A8A', marginTop: '8px', fontStyle: 'italic' }}>
          {question.mot.phonetique}
        </p>
      </div>

      {/* Propositions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {question.propositions.map((prop) => {
          let bg = '#161616'
          let border = '1px solid #2A2A2A'
          let color = '#F5F0EB'

          if (selected) {
            if (prop === question.bonneReponse) {
              bg = '#0D2B00'; border = '1px solid #4CAF50'; color = '#4CAF50'
            } else if (prop === selected) {
              bg = '#2B0000'; border = '1px solid #F44336'; color = '#F44336'
            }
          }

          return (
            <button
              key={prop}
              onClick={() => handleReponse(prop)}
              style={{
                padding: '16px', borderRadius: '12px',
                backgroundColor: bg, border, color,
                fontSize: '15px', cursor: selected ? 'default' : 'pointer',
                fontFamily: 'Georgia, serif', transition: 'all 0.2s',
              }}
            >
              {prop}
            </button>
          )
        })}
      </div>
    </div>
  )
}