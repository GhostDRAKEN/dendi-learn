import Link from 'next/link'
import ThemeToggle from './components/ThemeToggle'
import { createClient } from '@/lib/supabase/server'

async function getMotDuJour() {
  const supabase = await createClient()
  const { data: mots } = await supabase
    .from('mots')
    .select('fr, dendi, phonetique')
    .not('dendi', 'eq', 'N/A')
    .not('phonetique', 'eq', 'N/A')

  if (!mots || mots.length === 0) return null

  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const index = seed % mots.length

  return mots[index]
}

export default async function HomePage() {
  const motDuJour = await getMotDuJour()

  return (
    <main className="home-page">
      <header className="home-header">
        <div className="home-header-inner">
          <h1 className="home-brand">
            <span>Dendi Learn</span>
            <span className="home-brand-tagline">
              Langue du nord Bénin
            </span>
          </h1>
          <div className="home-header-actions">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className={`home-hero${motDuJour ? '' : ' home-hero-single'}`}>
        <div className="home-hero-copy">
          <p className="home-eyebrow">Première plateforme numérique</p>
          <h2 className="home-title">Fɔɔ nna suba !</h2>
          <p className="home-subtitle">
            Bienvenue — Apprenez le Dendi, langue du nord Bénin, à votre rythme.
          </p>

          <div className="home-cta-group">
            <Link href="/apprendre?niveau=debutant" className="home-cta-primary">
              <span aria-hidden="true">🌱</span>
              Commencer par le début
            </Link>
            <Link href="/apprendre" className="home-cta-secondary">
              Explorer librement <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {motDuJour && (
          <article className="home-word-card" aria-labelledby="mot-du-jour-title">
            <div className="home-word-card-glow" aria-hidden="true" />
            <p id="mot-du-jour-title" className="home-word-label">
              Mot du jour
            </p>
            <p className="home-word-dendi">{motDuJour.dendi}</p>
            <p className="home-word-phonetic">{motDuJour.phonetique}</p>
            <div className="home-word-divider" aria-hidden="true" />
            <p className="home-word-translation">{motDuJour.fr}</p>
            <Link href="/apprendre" className="home-word-link">
              Apprendre davantage <span aria-hidden="true">→</span>
            </Link>
          </article>
        )}
      </section>

      <footer className="home-footer">
        <p>
          <Link href="/connexion">Connexion</Link>
          {' · '}
          <Link href="/inscription">Créer un compte</Link>
        </p>
      </footer>
    </main>
  )
}
