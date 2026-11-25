import { getLearningLesson, hasLinguisticValue, type CurriculumLesson, type CurriculumMot } from './curriculum'

type ExerciseType = 'dendi-fr' | 'fr-dendi' | 'phonetic-fr'
type ExerciseMode = 'practice' | 'test'

export type Exercise = {
  mot: CurriculumMot
  type: ExerciseType
  prompt: string
  instruction: string
  detail?: string
  correctAnswer: string
  options: string[]
}

export function stableHash(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

// Only typographic equivalence. Accents, case and the original labels are preserved.
function answerKey(value: string) {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ')
}

export function isCorrectAnswer(exercise: Exercise, answer: string) {
  return answerKey(answer) === answerKey(exercise.correctAnswer)
}

const directions = ['dendi-fr', 'fr-dendi', 'phonetic-fr'] as const
const fields = {
  'dendi-fr': ['dendi', 'fr'],
  'fr-dendi': ['fr', 'dendi'],
  'phonetic-fr': ['phonetique', 'fr'],
} as const

function hasSingleAnswer(words: CurriculumMot[], word: CurriculumMot, type: ExerciseType) {
  const [prompt, answer] = fields[type]
  if (!hasLinguisticValue(word[prompt])) return false
  return words.every(other => !hasLinguisticValue(other[prompt]) ||
    answerKey(other[prompt]) !== answerKey(word[prompt]) ||
    answerKey(other[answer]) === answerKey(word[answer]))
}

function deterministicOptions(pool: string[], correctAnswer: string, seed: string, maximum: number) {
  const uniquePool = new Map(pool.map(value => [answerKey(value), value]))
  uniquePool.delete(answerKey(correctAnswer))
  const distractors = Array.from(uniquePool.values())
    .sort((a, b) => stableHash(`${seed}-${a}`) - stableHash(`${seed}-${b}`))
    .slice(0, Math.max(0, maximum - 1))

  return [correctAnswer, ...distractors]
    .sort((a, b) => stableHash(`${seed}-position-${a}`) - stableHash(`${seed}-position-${b}`))
}

function selectEvenly<T>(items: T[], count: number) {
  if (count >= items.length) return [...items]
  if (count <= 1) return items.slice(0, count)

  return Array.from({ length: count }, (_, index) => {
    const itemIndex = Math.round((index * (items.length - 1)) / (count - 1))
    return items[itemIndex]
  })
}

function createExercise(
  lesson: CurriculumLesson,
  mot: CurriculumMot,
  type: ExerciseType,
  mode: ExerciseMode,
): Exercise {
  const seed = `${lesson.id}-${mode}-${mot.id}-${type}`
  const maximumOptions = mode === 'practice' ? 3 : 4

  if (type === 'fr-dendi') {
    return {
      mot,
      type,
      prompt: mot.fr,
      instruction: 'Quelle est la forme Dendi ?',
      correctAnswer: mot.dendi,
      options: deterministicOptions(lesson.mots.map((item) => item.dendi), mot.dendi, seed, maximumOptions),
    }
  }

  if (type === 'phonetic-fr') {
    return {
      mot,
      type,
      prompt: mot.phonetique,
      instruction: 'Quelle traduction correspond à cette prononciation ?',
      detail: 'Phonétique',
      correctAnswer: mot.fr,
      options: deterministicOptions(lesson.mots.map((item) => item.fr), mot.fr, seed, maximumOptions),
    }
  }

  return {
    mot,
    type,
    prompt: mot.dendi,
    instruction: 'Que signifie ce mot en Dendi ?',
    detail: mode === 'practice' && hasLinguisticValue(mot.phonetique) ? mot.phonetique : undefined,
    correctAnswer: mot.fr,
    options: deterministicOptions(lesson.mots.map((item) => item.fr), mot.fr, seed, maximumOptions),
  }
}

export function createLessonExercises(sourceLesson: CurriculumLesson) {
  const lesson = getLearningLesson(sourceLesson)
  const practiceCount = Math.min(4, Math.max(2, Math.ceil(lesson.mots.length / 2)))
  const testCount = Math.min(6, lesson.mots.length)
  const candidates = lesson.mots.map(mot => ({
    mot,
    types: directions.filter(type => hasSingleAnswer(lesson.mots, mot, type)),
  })).filter(candidate => candidate.types.length > 0)

  function draw(count: number, mode: ExerciseMode) {
    return selectEvenly(candidates, count).map(({ mot, types }, index) => {
      const preferred = directions[index % directions.length]
      return createExercise(lesson, mot, types.includes(preferred) ? preferred : types[0], mode)
    })
  }

  return { practice: draw(practiceCount, 'practice'), test: draw(testCount, 'test') }
}

