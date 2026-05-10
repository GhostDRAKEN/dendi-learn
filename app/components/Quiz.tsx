'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (!user) return
      setUserId(user.id)
      const { data: progression } = await supabase
        .from('progression')
        .select('mot_id')
        .eq('user_id', user.id)
        .eq('vu', true)
      if (progression) setMotsVus(new Set(progression.map(p => p.mot_id as number)))
    })
  }, [])

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
    setPhase('quiz')
  }

  const handleReponse = async (reponse: string) => {
    if (selected) return
    setSelected(reponse)
    const correct = reponse === questions[index].bonneReponse
    if (correct) {
      setScore(s => s + 1)
      if (userId) {
        await supabase.from('progression').upsert({
          user_id: userId,
          mot_id: questions[index].mot.id,
          vu: true,
          maitrise: true,
        }, { onConflict: 'user_id,mot_id' })
      }
    }
    setTimeout(() => {
      if (index + 1 >= questions.length) {
        setTermine(true)
      } else {
        setIndex(i => i + 1)
        setSelected(null)
      }
    }, 1000)
  }

  // Phase choix de catégorie
  if (phase === 'choix') {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
          Mode Quiz
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '32px' }}>
          Choisir une catégorie pour commencer.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '32px' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategorieActive(cat)}
              style={{
                padding: '12px 16px', borderRadius: '12px', textAlign: 'left',
                backgroundColor: categorieActive === cat ? '#1A0F00' : 'var(--card)',
                border: categorieActive === cat ? '1px solid #E07B39' : '1px solid var(--border)',
                color: categorieActive === cat ? '#E07B39' : 'var(--text)',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'Georgia, serif',
              }}>
              {CATEGORIES_LABELS[cat] ?? cat}
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {(cat === 'Tous' ? mots : mots.filter(m => m.categorie === cat)).length} mots
              </span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={demarrerQuiz} disabled={motsFiltres.length < 4}
            style={{
              padding: '12px 32px', borderRadius: '9999px',
              backgroundColor: motsFiltres.length < 4 ? '#333' : '#E07B39',
              border: 'none', color: 'white', fontSize: '14px',
              cursor: motsFiltres.length < 4 ? 'not-allowed' : 'pointer',
              fontFamily: 'Georgia, serif', fontWeight: '600',
            }}>
            Commencer →
          </button>
          <button onClick={onQuitter}
            style={{ padding: '12px 24px', borderRadius: '9999px', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            Annuler
          </button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) return null

  const question = questions[index]

  // Écran résultat
  if (termine) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>
          {score >= 8 ? '🎯' : score >= 5 ? '💪' : '📚'}
        </p>
        <h2 style={{ fontSize: '28px', color: 'var(--text)', marginBottom: '8px' }}>
          {score} / {questions.length}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
          {score >= 8 ? 'Excellent !' : score >= 5 ? 'Bien joué !' : 'Continue à pratiquer !'}
        </p>
        <p style={{ color: '#E07B39', fontSize: '13px', marginBottom: '40px' }}>
          {score} mot{score > 1 ? 's' : ''} maîtrisé{score > 1 ? 's' : ''} sauvegardé{score > 1 ? 's' : ''}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={demarrerQuiz}
            style={{ padding: '12px 24px', borderRadius: '9999px', backgroundColor: '#E07B39', border: 'none', color: 'white', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            Rejouer
          </button>
          <button onClick={() => setPhase('choix')}
            style={{ padding: '12px 24px', borderRadius: '9999px', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            Changer de catégorie
          </button>
          <button onClick={onQuitter}
            style={{ padding: '12px 24px', borderRadius: '9999px', backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            Quitter
          </button>
        </div>
      </div>
    )
  }

  // Quiz
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Question {index + 1} / {questions.length}
        </span>
        <span style={{ color: '#E07B39', fontSize: '13px' }}>Score : {score}</span>
      </div>

      <div style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 24px', textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '2px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
          Que signifie ce mot en Dendi ?
        </p>
        <p style={{ fontSize: '32px', fontWeight: '700', color: '#E07B39' }}>{question.mot.dendi}</p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>{question.mot.phonetique}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {question.propositions.map((prop) => {
          let bg = 'var(--card)'
          let border = '1px solid var(--border)'
          let color = 'var(--text)'
          if (selected) {
            if (prop === question.bonneReponse) { bg = '#0D2B00'; border = '1px solid #4CAF50'; color = '#4CAF50' }
            else if (prop === selected) { bg = '#2B0000'; border = '1px solid #F44336'; color = '#F44336' }
          }
          return (
            <button key={prop} onClick={() => handleReponse(prop)}
              style={{ padding: '16px', borderRadius: '12px', backgroundColor: bg, border, color, fontSize: '15px', cursor: selected ? 'default' : 'pointer', fontFamily: 'Georgia, serif', transition: 'all 0.2s' }}>
              {prop}
            </button>
          )
        })}
      </div>
    </div>
  )
}