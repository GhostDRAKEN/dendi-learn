import Link from 'next/link'
import AppHeader from '../components/AppHeader'

const NIVEAUX = [
  { label: 'Débutant', slug: 'debutant', emoji: '🌱', intention: 'Découvrir les bases', desc: 'Salutations, couleurs, moments de la journée' },
  { label: 'Intermédiaire', slug: 'intermediaire', emoji: '🔥', intention: 'Enrichir son vocabulaire', desc: 'Verbes, prépositions, jours et mois' },
  { label: 'Avancé', slug: 'avance', emoji: '⭐', intention: 'Approfondir ses connaissances', desc: 'Corps humain, noms et adjectifs complexes' },
]

export default function NiveauxPage() {
  return (
    <main className="levels-page">
      <AppHeader />

      <section className="levels-content" aria-labelledby="levels-title">
        <div className="levels-intro">
          <p className="levels-eyebrow">Votre parcours</p>
          <h2 id="levels-title" className="levels-title">Choisissez votre niveau</h2>
          <p className="levels-subtitle">
            Commencez là où vous êtes le plus à l&apos;aise. Vous pourrez changer de niveau à tout moment.
          </p>
        </div>

        <div className="levels-grid">
          {NIVEAUX.map((niveau) => (
            <Link
              key={niveau.slug}
              href={`/parcours?niveau=${niveau.slug}`}
              className={`level-card level-card-${niveau.slug}`}
            >
              <article>
                <span className="level-card-icon" aria-hidden="true">{niveau.emoji}</span>
                <h3 className="level-card-title">{niveau.label}</h3>
                <p className="level-card-intention">{niveau.intention}</p>
                <p className="level-card-description">{niveau.desc}</p>
                <span className="level-card-action">
                  Choisir ce niveau <span aria-hidden="true">→</span>
                </span>
              </article>
            </Link>
          ))}
        </div>

        <Link href="/apprendre" className="levels-explore-link">
          Explorer tous les mots sans choisir de niveau <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  )
}
