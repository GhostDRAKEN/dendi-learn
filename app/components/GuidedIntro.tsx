import type { ReactNode } from 'react'
import type { CurriculumLesson } from '@/lib/curriculum'

// Editorial titles for lessons whose vocabulary has been reviewed. Revisit them if the groups change.
const lessonTitles: Partial<Record<string, string>> = {
  'debutant-salutations-01': 'Commençons par nous saluer',
  'debutant-salutations-02': 'Quelques mots de politesse',
  'debutant-salutations-03': 'Se présenter et prendre congé',
  'debutant-temps-essentiel-01': 'Se repérer dans le temps',
  'debutant-temps-essentiel-02': 'Les jours autour d’aujourd’hui',
  'debutant-couleurs-01': 'Découvrons les couleurs',
  'intermediaire-calendrier-01': 'Les jours de la semaine',
  'intermediaire-calendrier-02': 'De janvier à juin',
  'intermediaire-calendrier-03': 'De juillet à décembre',
}

const unitIcons: Partial<Record<string, ReactNode>> = {
  'debutant-salutations': <path d="M15 4H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1v3l4-3h5a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2ZM20 9a2 2 0 0 1 1 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-4a2 2 0 0 1-2-2" />,
  'debutant-temps-essentiel': <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  'debutant-couleurs': <>
    <path d="M12 3a9 9 0 1 0 0 18h1.5a1.75 1.75 0 0 0 1.2-3 1.5 1.5 0 0 1 1.1-2.5h1.5A3.7 3.7 0 0 0 21 12a9 9 0 0 0-9-9Z" />
    <path d="M7 12h.01M9.5 7.5h.01m5 0h.01M17 12h.01" strokeWidth="2.6" />
  </>,
  'intermediaire-calendrier': <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2" /></>,
  'intermediaire-verbes': <><circle cx="16" cy="5" r="2" /><path d="m5 12 4-4 4 1 2 4h4M12 10l-3 6h5l2 5m-7-5-4 4H2" /></>,
  'intermediaire-prepositions': <><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M3 12h3m12 0h3M12 3v3m0 12v3m-2-16 2-2 2 2m-4 14 2 2 2-2" /></>,
  'avance-corps': <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20v-1c0-3.2 2.5-5 6.5-5s6.5 1.8 6.5 5v1" /></>,
  'avance-noms': <><path d="M4 4h7l9 9a2 2 0 0 1 0 2.8L15.8 20a2 2 0 0 1-2.8 0l-9-9V4Z" /><circle cx="8.5" cy="8.5" r="1" /></>,
}

const defaultIcon = <path d="M12 6c-2-2-5-2.5-9-2v14c4-.5 7 0 9 2 2-2 5-2.5 9-2V4c-4-.5-7 0-9 2Zm0 0v14" />

export default function GuidedIntro({ lesson, unitNumber, onStart }: {
  lesson: CurriculumLesson
  unitNumber?: number
  onStart: () => void
}) {
  const title = lessonTitles[lesson.id] ?? lesson.title
  const wordCount = lesson.mots.length

  return (
    <section className="guided-panel guided-intro" aria-labelledby="guided-intro-title">
      <div className="guided-intro-copy">
        <div className="guided-intro-identity">
          <svg className="guided-intro-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {unitIcons[lesson.unitId] ?? defaultIcon}
          </svg>
          <p>{unitNumber !== undefined && <>Unité {unitNumber} · </>}{lesson.unitTitle}</p>
        </div>
        <h1 id="guided-intro-title">{title}</h1>
        <p className="guided-lead">
          <strong>{wordCount} {wordCount === 1 ? 'mot' : 'mots'}</strong> à découvrir en dendi, à votre rythme.
        </p>
      </div>
      <p className="guided-intro-flow">
        Entraînez-vous avant le test. Vous reverrez les mots qui vous ont posé difficulté.
      </p>
      <div className="guided-intro-actions">
        <button type="button" onClick={onStart} className="guided-primary-button">
          Commencer la leçon <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}
