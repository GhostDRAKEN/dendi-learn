const mainThemes = {
  Salutations: 'Salutations',
  temps: 'Temps',
  corps: 'Corps humain',
  verbes: 'Verbes',
  prepositions: 'Prépositions',
  noms: 'Noms & Adjectifs',
  couleurs: 'Couleurs',
} as const

const timeThemes = {
  temps__journee: 'Journée',
  temps__repere: 'Repères',
  temps__semaine: 'Semaine',
  temps__mois: 'Mois',
} as const

const labels = { ...mainThemes, ...timeThemes }
export type ExplorerTheme = keyof typeof labels
type CategorisedWord = { categorie: string }

export function wordsInExplorerTheme<T extends CategorisedWord>(words: T[], theme?: ExplorerTheme): T[] {
  if (!theme) return words
  return words.filter(word => theme === 'temps'
    ? Object.hasOwn(timeThemes, word.categorie)
    : word.categorie === theme)
}

export function explorerThemeLabel(theme: ExplorerTheme) {
  return labels[theme]
}

function availableThemes(words: CategorisedWord[], themes: Partial<typeof labels>) {
  return (Object.keys(themes) as ExplorerTheme[])
    .map(id => ({ id, label: labels[id], count: wordsInExplorerTheme(words, id).length }))
    .filter(theme => theme.count > 0)
}

export function getExplorerThemes(words: CategorisedWord[]) {
  return availableThemes(words, mainThemes)
}

export function getExplorerTimeThemes(words: CategorisedWord[]) {
  return availableThemes(words, timeThemes)
}

export function resolveExplorerTheme(value: unknown, words: CategorisedWord[]): ExplorerTheme | undefined {
  if (typeof value !== 'string' || !Object.hasOwn(labels, value)) return
  const theme = value as ExplorerTheme
  if (wordsInExplorerTheme(words, theme).length > 0) return theme
}

export function explorerHref(niveau?: string, theme?: ExplorerTheme) {
  const params = new URLSearchParams()
  if (niveau) params.set('niveau', niveau)
  if (theme) params.set('categorie', theme)
  const query = params.toString()
  return query ? `/apprendre?${query}` : '/apprendre'
}
