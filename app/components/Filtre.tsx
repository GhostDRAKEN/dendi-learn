'use client'
import { useState, useEffect, useMemo } from 'react'
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

export default function Filtre({ mots, categorieInitiale, onVusCountChange, onMotVu, motsDejaVus, niveauActif }: {
  mots: Mot[]
  categorieInitiale?: string
  onVusCountChange?: (count: number) => void
  onMotVu?: (motId: number) => void
  motsDejaVus?: Set<number>
  niveauActif?: string
}) {
  const [active, setActive] = useState(categorieInitiale ?? 'Tous')
  const [recherche, setRecherche] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showTempsMenu, setShowTempsMenu] = useState(false)
  const [vusIdsLocaux, setVusIdsLocaux] = useState<Set<number>>(new Set())
  const vusIds = useMemo(
    () => new Set([...(motsDejaVus ?? []), ...vusIdsLocaux]),
    [motsDejaVus, vusIdsLocaux]
  )

  useEffect(() => {
    onVusCountChange?.(vusIds.size)
  }, [vusIds, onVusCountChange])

  const isTempsActive = TEMPS_SOUS_CATEGORIES.includes(active)

  const suggestions = recherche.length >= 2
    ? mots.filter((m) =>
        m.fr.toLowerCase().includes(recherche.toLowerCase()) ||
        m.dendi.toLowerCase().includes(recherche.toLowerCase())
      ).slice(0, 5)
    : []

  const motsFiltres = mots
    .filter((m) => {
      if (active === 'Tous') return true
      if (active === 'temps') return TEMPS_SOUS_CATEGORIES.includes(m.categorie)
      return m.categorie === active
    })
    .filter((m) =>
      recherche === '' ||
      m.fr.toLowerCase().includes(recherche.toLowerCase()) ||
      m.dendi.toLowerCase().includes(recherche.toLowerCase()) ||
      m.phonetique.toLowerCase().includes(recherche.toLowerCase())
    )

  const countForCat = (cat: string) => {
    if (cat === 'temps') return mots.filter(m => TEMPS_SOUS_CATEGORIES.includes(m.categorie)).length
    return mots.filter(m => m.categorie === cat).length
  }

  const handleCategorieChange = (cat: string) => {
    setActive(cat)
    setShowTempsMenu(false)
  }

  const handleVue = (id: number) => {
    setVusIdsLocaux(prev => new Set(prev).add(id))
    onMotVu?.(id)
  }

  const vusCount = motsFiltres.filter(m => vusIds.has(m.id)).length
  const total = motsFiltres.length
  const progression = total > 0 ? Math.round((vusCount / total) * 100) : 0

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
          type="text"
          placeholder="Rechercher en français ou en Dendi..."
          value={recherche}
          onChange={(e) => { setRecherche(e.target.value); setShowSuggestions(true) }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => setShowSuggestions(true)}
          className="learn-search-input"
          role="combobox"
          aria-label="Rechercher un mot en français, en Dendi ou par sa phonétique"
          aria-autocomplete="list"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls="learn-search-suggestions"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul id="learn-search-suggestions" className="learn-search-suggestions">
            {suggestions.map((mot) => (
              <li key={mot.id}>
                <button
                  type="button"
                  className="learn-search-suggestion"
                  onClick={() => { setRecherche(mot.fr); setShowSuggestions(false) }}
                >
                  <span>{mot.fr}</span>
                  <span className="learn-search-suggestion-dendi">{mot.dendi}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
          // Cacher ⊞ si niveau actif
          if (cat === 'Tous' && niveauActif) return null

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

      <section className="learn-progress" aria-label="Progression des mots affichés">
        <div className="learn-progress-header">
          <span className="learn-progress-label">
            {progression === 100 ? '✓ Série complète' : 'Progression'}
          </span>
          <span className={`learn-progress-count${progression === 100 ? ' is-complete' : ''}`}>
            {vusCount} / {total} vus
          </span>
        </div>
        <div
          className="learn-progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={vusCount}
          aria-label={`${vusCount} mots vus sur ${total}`}
        >
          <div className={`learn-progress-value${progression === 100 ? ' is-complete' : ''}`} style={{ width: `${progression}%` }} />
        </div>
      </section>

      {motsFiltres.length === 0 ? (
        <div className="learn-empty-state" role="status">
          <span className="learn-empty-icon" aria-hidden="true">⌕</span>
          <h3>Aucun mot trouvé</h3>
          <p>
            {recherche
              ? <>Aucun résultat ne correspond à &quot;{recherche}&quot;. Essayez un autre mot ou une autre catégorie.</>
              : 'Aucun mot n’est disponible dans cette catégorie.'}
          </p>
        </div>
      ) : (
        <div className="mot-grid">
          {motsFiltres.map((mot) => (
            <MotCard key={`${active}-${mot.id}`} mot={mot} onVue={() => handleVue(mot.id)} dejaVu={vusIds.has(mot.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
