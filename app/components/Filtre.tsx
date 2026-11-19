'use client'
import { useState, useEffect, useId, useRef, type KeyboardEvent } from 'react'
import Link from 'next/link'
import type { NiveauId } from '@/lib/curriculum'
import { explorerHref, explorerThemeLabel, getExplorerThemes, getExplorerTimeThemes, wordsInExplorerTheme, type ExplorerTheme } from '@/lib/explorer-themes'
import MotCard from './MotCard'
import QuizWrapper from './QuizWrapper'

type Mot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
}

const levelLabels: Record<NiveauId, string> = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' }
const emptySearch = { text: '', wordId: null }
type Search = { text: string, wordId: number | null }

export default function Filtre({
  mots, theme, onMotVu, motsDejaVus, niveauActif, historyScope,
  counterState, isGuest, progressNotice, onResetHistory,
}: {
  mots: Mot[]
  theme?: ExplorerTheme
  onMotVu?: (motId: number) => void
  motsDejaVus: ReadonlySet<number>
  niveauActif?: NiveauId
  historyScope: number
  counterState: 'loading' | 'ready' | 'error'
  isGuest: boolean
  progressNotice: string | null
  onResetHistory?: () => void
}) {
  const scope = explorerHref(niveauActif, theme)
  const [searches, setSearches] = useState<Record<string, Search>>({})
  const { text: recherche, wordId: selectedWordId } = searches[scope] ?? emptySearch
  const [suggestionScope, setSuggestionScope] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousScope = useRef(scope)
  const navigationFocus = useRef<{ href: string, target: 'heading' | 'search' } | null>(null)
  const listId = useId()
  const searchId = useId()
  const hasQuery = recherche.trim().length > 0
  const showThemes = !theme && !hasQuery
  const themeLabel = theme ? explorerThemeLabel(theme) : undefined
  const isTimeTheme = theme === 'temps' || theme?.startsWith('temps__')
  const themes = showThemes ? getExplorerThemes(mots) : []
  const themeWords = wordsInExplorerTheme(mots, theme)
  const query = recherche.toLowerCase()
  // The server already applies the level. Use one matching pool for cards and suggestions.
  const matches = !hasQuery ? themeWords : themeWords.filter(mot =>
    [mot.fr, mot.dendi, mot.phonetique].some(value => value?.toLowerCase().includes(query)))
  const motsFiltres = showThemes ? [] : selectedWordId === null
    ? matches
    : matches.filter((mot) => mot.id === selectedWordId)
  const suggestions = recherche.length >= 2 ? matches.slice(0, 5) : []
  const expanded = suggestionScope === scope && suggestions.length > 0
  const activeSuggestion = expanded ? suggestions[activeIndex] : undefined
  const optionId = (id: number) => `${listId}-${id}`

  useEffect(() => {
    if (!activeSuggestion) return
    const option = document.getElementById(`${listId}-${activeSuggestion.id}`)
    option?.scrollIntoView({ block: 'nearest' })
  }, [activeSuggestion, listId])

  useEffect(() => {
    if (previousScope.current === scope) return
    previousScope.current = scope
    const navigation = navigationFocus.current
    navigationFocus.current = null
    if (navigation?.href === scope && navigation.target === 'search') searchRef.current?.focus()
    else if (navigation?.href === scope || document.activeElement === document.body) headingRef.current?.focus()
  }, [scope])

  const closeSuggestions = () => {
    setSuggestionScope(null)
    setActiveIndex(-1)
  }

  const setSearch = (search: Search) => setSearches(current => ({ ...current, [scope]: search }))

  const selectSuggestion = (mot: Mot) => {
    searchRef.current?.focus({ preventScroll: true })
    setSearch({ text: mot.fr, wordId: mot.id })
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
      setSuggestionScope(scope)
      const forward = event.key === 'ArrowDown'
      const lastIndex = suggestions.length - 1
      const nextIndex = activeSuggestion ? activeIndex + (forward ? 1 : -1) : (forward ? 0 : lastIndex)
      setActiveIndex(Math.max(0, Math.min(lastIndex, nextIndex)))
    }
  }

  const clearSearch = () => {
    searchRef.current?.focus()
    setSearch(emptySearch)
    closeSuggestions()
  }

  const navigateTo = (href: string, preserveQuery = false) => {
    navigationFocus.current = { href, target: preserveQuery && hasQuery ? 'search' : 'heading' }
    setSearches(current => ({
      ...current,
      [href]: preserveQuery ? { text: recherche, wordId: null } : emptySearch,
    }))
    closeSuggestions()
  }

  const allThemesHref = explorerHref(niveauActif)
  const allLevelsHref = explorerHref(undefined, theme)
  const consultationPool = theme ? themeWords : motsFiltres
  const vusCount = consultationPool.filter(m => motsDejaVus.has(m.id)).length
  const total = consultationPool.length
  const progressReady = counterState === 'ready'
  const progression = progressReady && total > 0 ? (vusCount / total) * 100 : 0
  const progressLabel = `Mots ${isGuest ? 'consultés' : 'vus'} ${theme ? 'dans ce thème' : 'dans ces résultats'}`
  const levelLabel = niveauActif ? levelLabels[niveauActif] : undefined
  const broadenSearch = theme && hasQuery && (
    <Link href={allThemesHref} scroll={false} className="learn-reset-filters" onNavigate={() => navigateTo(allThemesHref, true)}>
      Rechercher dans tous les thèmes
    </Link>
  )

  return (
    <div className="learn-tools">
      {theme && (
        <header className="learn-theme-header">
          <Link href={allThemesHref} scroll={false} className="learn-theme-back" onNavigate={() => navigateTo(allThemesHref)}>
            <span aria-hidden="true">←</span> Changer de thème
          </Link>
          <div className="learn-theme-heading">
            <h2 ref={headingRef} tabIndex={-1} className="learn-view-title">{themeLabel}</h2>
            <span>{themeWords.length} {themeWords.length === 1 ? 'mot' : 'mots'}</span>
          </div>
          {isTimeTheme && (
            <nav className="learn-time-themes" aria-label="Sous-thèmes de Temps">
              {[{ id: 'temps' as const, label: 'Tout le thème' }, ...getExplorerTimeThemes(mots)].map(item => {
                const href = explorerHref(niveauActif, item.id)
                return <Link key={item.id} href={href} scroll={false} aria-current={theme === item.id ? 'page' : undefined}
                  onNavigate={() => { if (href !== scope) navigateTo(href) }}>{item.label}</Link>
              })}
            </nav>
          )}
        </header>
      )}
      <label htmlFor={searchId} className="learn-search-label">
        {themeLabel ? `Rechercher dans le thème « ${themeLabel} »` : 'Rechercher dans le lexique'}
      </label>
      <div className={`learn-search${theme ? '' : ' learn-search--global'}`}>
        <div className="learn-search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <input
          id={searchId}
          ref={searchRef}
          type="text"
          placeholder="Français, dendi ou phonétique"
          value={recherche}
          onChange={(e) => {
            setSearch({ text: e.target.value, wordId: null })
            setActiveIndex(-1)
            setSuggestionScope(scope)
          }}
          onBlur={closeSuggestions}
          onFocus={() => { if (selectedWordId === null) setSuggestionScope(scope) }}
          onKeyDown={handleSearchKey}
          autoComplete="off"
          className="learn-search-input"
          role="combobox"
          aria-label={`Rechercher un mot ${themeLabel ? `dans le thème « ${themeLabel} »` : 'dans le lexique'}, en français, en dendi ou par sa phonétique`}
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

      {levelLabel && (
        <div className="learn-level-scope">
          <p>Niveau affiché <strong>{levelLabel}</strong></p>
          <Link href={allLevelsHref} scroll={false} className="learn-level-link" onNavigate={() => navigateTo(allLevelsHref, true)}>
            {hasQuery ? 'Rechercher dans tous les niveaux' : 'Tous les niveaux dans Explorer'}
          </Link>
        </div>
      )}

      {showThemes && (
        <section className="learn-discovery" aria-labelledby="learn-themes-title">
          <div className="learn-discovery-header">
            <h2 id="learn-themes-title" ref={headingRef} tabIndex={-1} className="learn-view-title">Explorer par thème</h2>
            {themes.length > 0 && (
              <p className="learn-discovery-summary">
                {mots.length} {mots.length === 1 ? 'mot disponible' : 'mots disponibles'}{' '}
                <span aria-hidden="true">·</span>{' '}
                {themes.length} {themes.length === 1 ? 'thème' : 'thèmes'}
              </p>
            )}
          </div>
          {themes.length > 0 ? (
            <ul className="learn-theme-grid">
              {themes.map(item => {
                const href = explorerHref(niveauActif, item.id)
                return (
                  <li key={item.id}>
                    <Link href={href} scroll={false} className="learn-theme-card" onNavigate={() => navigateTo(href)}>
                      <span className="learn-theme-card-copy">
                        <strong>{item.label}</strong>
                        <span>{item.count} {item.count === 1 ? 'mot' : 'mots'}</span>
                      </span>
                      <span className="learn-theme-arrow" aria-hidden="true">→</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : <p className="learn-progress-notice">Aucun thème disponible pour ce niveau.</p>}
        </section>
      )}

      {!showThemes && !theme && (
        <h2 ref={headingRef} tabIndex={-1} className="learn-view-title learn-results-title">Résultats de recherche</h2>
      )}
      {hasQuery && motsFiltres.length > 0 && (
        <div className="learn-result-summary">
          {theme && <p role="status">{motsFiltres.length} {motsFiltres.length === 1 ? 'résultat' : 'résultats'}</p>}
          {broadenSearch}
        </div>
      )}
      {(!showThemes || progressNotice) && <section className="learn-progress" aria-label={progressLabel} aria-busy={counterState === 'loading'}>
        {!showThemes && <>
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
        </>}
        {progressNotice && <p className="learn-progress-notice" role="status">{progressNotice}</p>}
        {onResetHistory && <button className="learn-reset-filters" type="button" onClick={() => {
          searchRef.current?.focus()
          onResetHistory()
        }}>Réinitialiser l’historique local</button>}
      </section>}

      {!showThemes && motsFiltres.length === 0 && (
        <div className="learn-empty-state">
          <span className="learn-empty-icon" aria-hidden="true">⌕</span>
          <div role="status">
            <h3>Aucun mot trouvé</h3>
            <p>
              Aucun résultat pour « {recherche} »{themeLabel ? ` dans le thème « ${themeLabel} »` : ''}.
            </p>
          </div>
          {broadenSearch}
        </div>
      )}

      {theme && (
        <div className="explorer-quiz-action">
          <QuizWrapper mots={mots} description={levelLabel ? `Tous les thèmes du niveau ${levelLabel}` : 'Tous les thèmes du lexique'} />
        </div>
      )}

      {!showThemes && motsFiltres.length > 0 && (
        <div className="mot-grid">
          {motsFiltres.map((mot) => (
            <MotCard
              key={`${historyScope}-${scope}-${mot.id}`}
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
