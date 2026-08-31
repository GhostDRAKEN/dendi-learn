export const NIVEAUX = ['debutant', 'intermediaire', 'avance'] as const

export type NiveauId = (typeof NIVEAUX)[number]

export type CurriculumMot = {
  id: number
  fr: string
  dendi: string
  phonetique: string
  categorie: string
  niveau: string
}

export type ProgressionMot = {
  mot_id: number
  vu: boolean
  maitrise: boolean
}

export type LessonStatus = 'a-decouvrir' | 'en-cours' | 'decouverte-complete' | 'maitrisee'

export type CurriculumLesson = {
  id: string
  title: string
  niveau: NiveauId
  unitId: string
  unitTitle: string
  index: number
  totalInUnit: number
  mots: CurriculumMot[]
}

export type CurriculumUnit = {
  id: string
  title: string
  niveau: NiveauId
  lessons: CurriculumLesson[]
}

export type CurriculumSection = {
  id: NiveauId
  title: string
  intention: string
  units: CurriculumUnit[]
}

type UnitDefinition = {
  id: string
  title: string
  categories: string[]
}

type SectionDefinition = {
  id: NiveauId
  title: string
  intention: string
  units: UnitDefinition[]
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    id: 'debutant',
    title: 'Débutant',
    intention: 'Découvrir les bases',
    units: [
      { id: 'salutations', title: 'Salutations', categories: ['Salutations'] },
      { id: 'temps-essentiel', title: 'Temps essentiel', categories: ['temps__journee', 'temps__repere'] },
      { id: 'couleurs', title: 'Couleurs', categories: ['couleurs'] },
    ],
  },
  {
    id: 'intermediaire',
    title: 'Intermédiaire',
    intention: 'Enrichir son vocabulaire',
    units: [
      { id: 'calendrier', title: 'Calendrier', categories: ['temps__semaine', 'temps__mois'] },
      { id: 'verbes', title: 'Verbes', categories: ['verbes'] },
      { id: 'prepositions', title: 'Prépositions', categories: ['prepositions'] },
    ],
  },
  {
    id: 'avance',
    title: 'Avancé',
    intention: 'Approfondir ses connaissances',
    units: [
      { id: 'corps', title: 'Corps humain', categories: ['corps'] },
      { id: 'noms', title: 'Noms et adjectifs', categories: ['noms'] },
    ],
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  Salutations: 'Salutations',
  temps__journee: 'Temps — Journée',
  temps__repere: 'Temps — Repères',
  temps__semaine: 'Temps — Semaine',
  temps__mois: 'Temps — Mois',
  couleurs: 'Couleurs',
  corps: 'Corps humain',
  verbes: 'Verbes',
  prepositions: 'Prépositions',
  noms: 'Noms et adjectifs',
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function distributeWords(mots: CurriculumMot[]) {
  if (mots.length === 0) return []

  const lessonCount = Math.max(1, Math.ceil(mots.length / 7))
  const baseSize = Math.floor(mots.length / lessonCount)
  const largerLessons = mots.length % lessonCount
  const groups: CurriculumMot[][] = []
  let cursor = 0

  for (let index = 0; index < lessonCount; index += 1) {
    const size = baseSize + (index < largerLessons ? 1 : 0)
    groups.push(mots.slice(cursor, cursor + size))
    cursor += size
  }

  return groups
}

function orderUnitWords(mots: CurriculumMot[], categories: string[]) {
  const categoryOrder = new Map(categories.map((category, index) => [category, index]))

  return [...mots].sort((a, b) => {
    const categoryDifference = (categoryOrder.get(a.categorie) ?? categories.length) -
      (categoryOrder.get(b.categorie) ?? categories.length)
    return categoryDifference || a.id - b.id
  })
}

function createUnit(definition: UnitDefinition, niveau: NiveauId, mots: CurriculumMot[]): CurriculumUnit {
  const unitWords = orderUnitWords(
    mots.filter((mot) => definition.categories.includes(mot.categorie)),
    definition.categories,
  )
  const groups = distributeWords(unitWords)

  return {
    id: `${niveau}-${definition.id}`,
    title: definition.title,
    niveau,
    lessons: groups.map((lessonWords, index) => ({
      id: `${niveau}-${definition.id}-${String(index + 1).padStart(2, '0')}`,
      title: `${definition.title} ${index + 1}`,
      niveau,
      unitId: `${niveau}-${definition.id}`,
      unitTitle: definition.title,
      index: index + 1,
      totalInUnit: groups.length,
      mots: lessonWords,
    })),
  }
}

export function buildCurriculum(mots: CurriculumMot[]): CurriculumSection[] {
  return SECTION_DEFINITIONS.map((sectionDefinition) => {
    const sectionWords = mots.filter((mot) => mot.niveau === sectionDefinition.id)
    const configuredCategories = new Set(sectionDefinition.units.flatMap((unit) => unit.categories))
    const fallbackCategories = Array.from(
      new Set(sectionWords.filter((mot) => !configuredCategories.has(mot.categorie)).map((mot) => mot.categorie)),
    ).sort()
    const unitDefinitions = [
      ...sectionDefinition.units,
      ...fallbackCategories.map((category) => ({
        id: slugify(category),
        title: CATEGORY_LABELS[category] ?? category,
        categories: [category],
      })),
    ]

    return {
      id: sectionDefinition.id,
      title: sectionDefinition.title,
      intention: sectionDefinition.intention,
      units: unitDefinitions
        .map((unitDefinition) => createUnit(unitDefinition, sectionDefinition.id, sectionWords))
        .filter((unit) => unit.lessons.length > 0),
    }
  })
}

export function flattenLessons(curriculum: CurriculumSection[]) {
  return curriculum.flatMap((section) => section.units.flatMap((unit) => unit.lessons))
}

export function getLessonStatus(lesson: CurriculumLesson, progression: ProgressionMot[]): LessonStatus {
  const progressionByMot = new Map(progression.map((item) => [item.mot_id, item]))
  const vus = lesson.mots.filter((mot) => {
    const state = progressionByMot.get(mot.id)
    return state?.vu || state?.maitrise
  }).length
  const maitrises = lesson.mots.filter((mot) => progressionByMot.get(mot.id)?.maitrise).length

  if (maitrises === lesson.mots.length) return 'maitrisee'
  if (vus === lesson.mots.length) return 'decouverte-complete'
  if (vus > 0) return 'en-cours'
  return 'a-decouvrir'
}

export function getLessonProgress(lesson: CurriculumLesson, progression: ProgressionMot[]) {
  const progressionByMot = new Map(progression.map((item) => [item.mot_id, item]))
  const seen = lesson.mots.filter((mot) => {
    const state = progressionByMot.get(mot.id)
    return state?.vu || state?.maitrise
  }).length
  const mastered = lesson.mots.filter((mot) => progressionByMot.get(mot.id)?.maitrise).length

  return { seen, mastered, total: lesson.mots.length }
}

export function getRecommendedLesson(
  curriculum: CurriculumSection[],
  niveau: NiveauId,
  progression: ProgressionMot[],
) {
  const sectionsFromCurrent = curriculum.slice(Math.max(0, NIVEAUX.indexOf(niveau)))
  const lessons = sectionsFromCurrent.flatMap((section) => section.units.flatMap((unit) => unit.lessons))

  const partiallyStarted = lessons.find((lesson) => {
    const { seen, total } = getLessonProgress(lesson, progression)
    return seen > 0 && seen < total
  })
  if (partiallyStarted) return partiallyStarted

  return lessons.find((lesson) => getLessonStatus(lesson, progression) !== 'maitrisee') ?? lessons[0] ?? null
}

export function isNiveauId(value: string | undefined): value is NiveauId {
  return Boolean(value && NIVEAUX.includes(value as NiveauId))
}
