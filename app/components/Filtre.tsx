'use client'
import { useState, useEffect, useId, useRef, type KeyboardEvent } from 'react'
import Link from 'next/link'
import MotCard from './MotCard'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

const TEMPS_SOUS_CATEGORIES = ['temps__journee', 'temps__repere', 'temps__semaine', 'temps__mois']

const CATEGORIES_ORDER = [
  'Tous', 'Salutations', 'temps', 'corps', 'verbes', 'prepositions', 'noms', 'couleurs',
]

const CATEGORIES_LABELS: Record<string, string> = {
  'Tous': 'Tous',
  'Salutations': 'Salutations',
  'temps': 'Temps',
  'temps__journee': 'Journée',
  'temps__repere': 'Repères',
  'temps__semaine': 'Semaine',
  'temps__mois': 'Mois',
  'corps': 'Corps humain',
  'verbes': 'Verbes',
  'prepositions': 'Prépositions',
  'noms': 'Noms & Adjectifs',
  'couleurs': 'Couleurs',
}

export default function Filtre({
  mots, categorieInitiale, onMotVu, motsDejaVus, niveauActif, historyScope,
  counterState, isGuest, progressNotice, onResetHistory,
}: {
  mots: Mot[]
  categorieInitiale?: string
  onMotVu?: (motId: number) => void
  motsDejaVus: ReadonlySet<number>
  niveauActif?: string
  historyScope: number
  counterState: 'loading' | 'ready' | 'error'
  isGuest: boolean
  progressNotice: string | null
  onResetHistory?: () => void
}) {
  const [active, setActive] = useState(categorieInitiale ?? 'Tous')
  const [recherche, setRecherche] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [selectedWordId, setSelectedWordId] = useState<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [showTempsMenu, setShowTempsMenu] = useState(false)

  const isTempsActive = active === 'temps' || TEMPS_SOUS_CATEGORIES.includes(active)
  const query = recherche.toLowerCase()
  // The server already applies the level. Use one matching pool for cards and suggestions.
  const matches = mots.filter((mot) =>
    (active === 'Tous' || mot.categorie === active ||
      (active === 'temps' && TEMPS_SOUS_CATEGORIES.includes(mot.categorie))) &&
    (query === '' || [mot.fr, mot.dendi, mot.phonetique].some(
      (value) => value?.toLowerCase().includes(query),
    )),
  )
  const motsFiltres = selectedWordId === null
    ? matches
    : matches.filter((mot) => mot.id === selectedWordId)
  const suggestions = recherche.length >= 2 ? matches.slice(0, 5) : []
  const expanded = showSuggestions && suggestions.length > 0
  const activeSuggestion = expanded ? suggestions[activeIndex] : undefined
  const optionId = (id: number) => `${listId}-${id}`

  useEffect(() => {
    if (!activeSuggestion) return
    const option = document.getElementById(`${listId}-${activeSuggestion.id}`)
    option?.scrollIntoView({ block: 'nearest' })
  }, [activeSuggestion, listId])

  const closeSuggestions = () => {
    setShowSuggestions(false)
    setActiveIndex(-1)
  }

  const selectSuggestion = (mot: Mot) => {
    searchRef.current?.focus({ preventScroll: true })
    setRecherche(mot.fr)
    setSelectedWordId(mot.id)
    closeSuggestions()
  }

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key === 'Escape' && expanded) {
      event.preventDefault()
      closeSuggestions()
    } else if (event.key === 'Enter' && activeSuggestion) {
      event.preventDefault()
      selectSuggestion(activeSuggestion)
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && suggestions.length > 0) {
      event.preventDefault()
      setShowSuggestions(true)
      const forward = event.key === 'ArrowDown'
      const lastIndex = suggestions.length - 1
      const nextIndex = activeSuggestion ? activeIndex + (forward ? 1 : -1) : (forward ? 0 : lastIndex)
      setActiveIndex(Math.max(0, Math.min(lastIndex, nextIndex)))
    }
  }

  const clearSearch = () => {
    searchRef.current?.focus()
    setRecherche('')
    setSelectedWordId(null)
    closeSuggestions()
  }

  const countForCat = (cat: string) => {
    if (cat === 'temps') return mots.filter(m => TEMPS_SOUS_CATEGORIES.includes(m.categorie)).length
    return mots.filter(m => m.categorie === cat).length
  }

  const handleCategorieChange = (cat: string) => {
    setActive(cat)
    setSelectedWordId(null)
    setShowTempsMenu(false)
    closeSuggestions()
  }

  const clearFilters = () => {
    searchRef.current?.focus()
    handleCategorieChange('Tous')
  }

  const vusCount = motsFiltres.filter(m => motsDejaVus.has(m.id)).length
  const total = motsFiltres.length
  const progressReady = counterState === 'ready'
  const progression = progressReady && total > 0 ? (vusCount / total) * 100 : 0
  const progressLabel = isGuest ? 'Mots consultés dans ces résultats' : 'Mots vus dans ces résultats'

  // Catégories disponibles dans les mots actuels
  const categoriesDisponibles = new Set(mots.map(m => m.categorie))

  return (
    <div className="learn-tools">
      <div className="learn-search">
        <div className="learn-search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <input
          ref={searchRef}
          type="text"
          placeholder="Rechercher en français ou en Dendi..."
          value={recherche}
          onChange={(e) => {
            setRecherche(e.target.value)
            setSelectedWordId(null)
            setActiveIndex(-1)
            setShowSuggestions(true)
          }}
          onBlur={closeSuggestions}
          onFocus={() => { if (selectedWordId === null) setShowSuggestions(true) }}
          onKeyDown={handleSearchKey}
          autoComplete="off"
          className="learn-search-input"
          role="combobox"
          aria-label="Rechercher un mot en français, en Dendi ou par sa phonétique"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={activeSuggestion ? optionId(activeSuggestion.id) : undefined}
        />
        {recherche && (
          <button type="button" className="learn-search-clear" aria-label="Effacer la recherche" onClick={clearSearch}>
            <span aria-hidden="true">×</span>
          </button>
        )}
        <ul id={listId} hidden={!expanded} tabIndex={-1} role="listbox" aria-label="Suggestions de mots" className="learn-search-suggestions">
          {expanded && suggestions.map((mot) => (
            <li
              key={mot.id}
              id={optionId(mot.id)}
              role="option"
              aria-selected={activeSuggestion?.id === mot.id}
              className="learn-search-suggestion"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(mot)}
            >
              <span>{mot.fr}</span>
              <span className="learn-search-suggestion-dendi">{mot.dendi}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="learn-mobile-category">
        <label htmlFor="learn-category-select">Catégorie</label>
        <select id="learn-category-select" value={active} onChange={(event) => handleCategorieChange(event.target.value)}>
          <option value="Tous">Toutes les catégories ({mots.length})</option>
          {CATEGORIES_ORDER.filter(cat => cat !== 'Tous').map(cat => {
            if (cat === 'temps') {
              const available = TEMPS_SOUS_CATEGORIES.filter(sub => categoriesDisponibles.has(sub))
              return available.length > 0 ? (
                <optgroup key={cat} label="Temps">
                  <option value="temps">Temps — tous les mots ({countForCat('temps')})</option>
                  {available.map(sub => <option key={sub} value={sub}>{CATEGORIES_LABELS[sub]} ({countForCat(sub)})</option>)}
                </optgroup>
              ) : null
            }
            return categoriesDisponibles.has(cat) ? <option key={cat} value={cat}>{CATEGORIES_LABELS[cat]} ({countForCat(cat)})</option> : null
          })}
        </select>
      </div>

      <div className="learn-categories" role="group" aria-label="Filtrer les mots par catégorie">
        {CATEGORIES_ORDER.map((cat) => {
          // Cacher les catégories non disponibles dans les mots filtrés
          if (cat !== 'Tous' && cat !== 'temps') {
            if (!categoriesDisponibles.has(cat)) return null
          }
          if (cat === 'temps') {
            const tempsDisponible = TEMPS_SOUS_CATEGORIES.some(s => categoriesDisponibles.has(s))
            if (!tempsDisponible) return null
          }

          if (cat === 'temps') {
            return (
              <div key="temps" className="learn-category-menu">
                <button
                  type="button"
                  onClick={() => setShowTempsMenu(!showTempsMenu)}
                  className={`learn-category-chip${isTempsActive ? ' is-active' : ''}`}
                  aria-expanded={showTempsMenu}
                  aria-controls="learn-time-categories"
                >
                  Temps <span aria-hidden="true">▾</span> <span className="learn-category-count">({countForCat('temps')})</span>
                </button>
                {showTempsMenu && (
                  <div id="learn-time-categories" className="learn-category-dropdown">
                    {TEMPS_SOUS_CATEGORIES.filter(s => categoriesDisponibles.has(s)).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleCategorieChange(sub)}
                        className={`learn-category-option${active === sub ? ' is-active' : ''}`}
                        aria-pressed={active === sub}
                      >
                        {CATEGORIES_LABELS[sub]}
                        <span className="learn-category-count">({mots.filter(m => m.categorie === sub).length})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategorieChange(cat)}
              className={`learn-category-chip${active === cat ? ' is-active' : ''}`}
              aria-pressed={active === cat}
            >
              {CATEGORIES_LABELS[cat] ?? cat}
              {cat !== 'Tous' && <span className="learn-category-count">({countForCat(cat)})</span>}
            </button>
          )
        })}
      </div>

      <section className="learn-progress" aria-label={progressLabel} aria-busy={counterState === 'loading'}>
        <div className="learn-progress-header">
          <span className="learn-progress-label">
            {counterState === 'loading' ? 'Chargement de l’historique…' : progressLabel}
          </span>
          <span className={`learn-progress-count${progression === 100 ? ' is-complete' : ''}`} role="status">
            {total === 0 ? 'Aucun résultat' : <>{progressReady ? vusCount : '—'} / {total}</>}
          </span>
        </div>
        <div
          className="learn-progress-track"
          role={total > 0 && counterState !== 'error' ? 'progressbar' : undefined}
          aria-valuemin={total > 0 && counterState !== 'error' ? 0 : undefined}
          aria-valuemax={total > 0 && counterState !== 'error' ? total : undefined}
          aria-valuenow={total > 0 && progressReady ? vusCount : undefined}
          aria-label={total > 0 && counterState !== 'error' ? progressLabel : undefined}
        >
          <div className={`learn-progress-value${progression === 100 ? ' is-complete' : ''}`} style={{ width: `${progression}%` }} />
        </div>
        {progressNotice && <p className="learn-progress-notice" role="status">{progressNotice}</p>}
        {onResetHistory && <button className="learn-reset-filters" type="button" onClick={() => {
          searchRef.current?.focus()
          onResetHistory()
        }}>Réinitialiser l’historique local</button>}
      </section>

      {motsFiltres.length === 0 ? (
        <div className="learn-empty-state">
          <span className="learn-empty-icon" aria-hidden="true">⌕</span>
          <div role="status">
            <h3>Aucun mot trouvé</h3>
            <p>
              {recherche
                ? <>Aucun résultat pour « {recherche} »{active !== 'Tous' || niveauActif ? ' avec ces filtres' : ''}.</>
                : 'Aucun mot n’est disponible avec ces filtres.'}
            </p>
          </div>
          {niveauActif ? (
            <Link href="/apprendre" scroll={false} className="learn-reset-filters" onNavigate={clearFilters}>
              Effacer les filtres
            </Link>
          ) : active !== 'Tous' && (
            <button type="button" className="learn-reset-filters" onClick={clearFilters}>
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="mot-grid">
          {motsFiltres.map((mot) => (
            <MotCard
              key={`${historyScope}-${active}-${mot.id}`}
              mot={mot}
              onVue={onMotVu ? () => onMotVu(mot.id) : undefined}
              dejaVu={motsDejaVus.has(mot.id)}
              disabled={!onMotVu}
              seenLabel={isGuest ? 'Déjà consulté' : 'Déjà vu'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
