import type { ReactNode } from 'react'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function AppHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <h1 className="site-brand">
          <Link href="/" aria-label="Dendi Learn — accueil">
            <span className="site-brand-name">Dendi Learn</span>
            <span className="site-brand-tagline">Langue du nord Bénin</span>
          </Link>
        </h1>

        <div className="site-header-controls">
          {actions && <div className="site-page-actions">{actions}</div>}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
