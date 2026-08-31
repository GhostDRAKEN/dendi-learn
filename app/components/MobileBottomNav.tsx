'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSyncExternalStore, type ReactNode } from 'react'
import { isNiveauId } from '@/lib/curriculum'

const LEVEL_KEY = 'dendi-guided-level'
const MOBILE_NAV_ROUTES = ['/parcours', '/apprendre', '/profil'] as const

type NavItem = {
  href: string
  label: string
  path: (typeof MOBILE_NAV_ROUTES)[number]
  icon: ReactNode
}

function subscribeToLevel(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('dendi-guided-resume', callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('dendi-guided-resume', callback)
  }
}

function getStoredLevel() {
  try {
    return window.localStorage.getItem(LEVEL_KEY)
  } catch {
    return null
  }
}

function getStoredLevelServerSnapshot() {
  return null
}

export default function MobileBottomNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const storedLevel = useSyncExternalStore(
    subscribeToLevel,
    getStoredLevel,
    getStoredLevelServerSnapshot,
  )

  if (!MOBILE_NAV_ROUTES.includes(pathname as (typeof MOBILE_NAV_ROUTES)[number])) {
    return null
  }

  const requestedLevel = searchParams.get('niveau') ?? undefined
  const currentLevel = isNiveauId(requestedLevel)
    ? requestedLevel
    : isNiveauId(storedLevel ?? undefined) ? storedLevel : null
  const parcoursHref = currentLevel ? `/parcours?niveau=${currentLevel}` : '/parcours'

  const items: NavItem[] = [
    {
      path: '/parcours',
      href: parcoursHref,
      label: 'Parcours',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="18" r="2.25" />
          <circle cx="18" cy="6" r="2.25" />
          <path d="M8.1 17.2c3.2-1 2.6-4.1 5.1-5.1 1.1-.5 2.1-.4 3.1-1.7" />
        </svg>
      ),
    },
    {
      path: '/apprendre',
      href: '/apprendre',
      label: 'Explorer',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="m15 15 4 4" />
        </svg>
      ),
    },
    {
      path: '/profil',
      href: '/profil',
      label: 'Profil',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 19c.8-3.2 3-5 6.5-5s5.7 1.8 6.5 5" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile principale">
      <div className="mobile-bottom-nav-inner">
        {items.map((item) => {
          const active = pathname === item.path

          return (
            <Link
              key={item.path}
              href={item.href}
              className={`mobile-bottom-nav-link${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="mobile-bottom-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
