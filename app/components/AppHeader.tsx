import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function AppHeader({ page }: { page?: 'parcours' | 'apprendre' | 'profil' }) {
  return (
    <header className="site-header site-header-app">
      <div className="site-header-inner">
        <h1 className="site-brand">
          <Link href="/" aria-label="Dendi Learn — accueil">
            <span className="site-brand-name">Dendi Learn</span>
            <span className="site-brand-tagline">Langue du nord Bénin</span>
          </Link>
        </h1>

        <div className="site-header-controls">
          <nav className="site-primary-nav" aria-label="Navigation principale">
            <Link href="/parcours" aria-current={page === 'parcours' ? 'page' : undefined}>Parcours</Link>
            <Link href="/apprendre" aria-current={page === 'apprendre' ? 'page' : undefined}>Explorer</Link>
          </nav>
          <ThemeToggle />
          {!page && (
            <Link href="/profil" className="site-mobile-account" aria-label="Votre espace Dendi-Learn" title="Votre espace Dendi-Learn">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5.5 20v-1c0-3.2 2.5-5 6.5-5s6.5 1.8 6.5 5v1" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
