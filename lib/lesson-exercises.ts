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

function deterministicOptions(pool: string[], correctAnswer: string, seed: string, maximum: number) {
  const uniquePool = Array.from(new Set(pool.filter(Boolean)))
  const distractors = uniquePool
    .filter((value) => value !== correctAnswer)
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
  questionIndex: number,
  mode: ExerciseMode,
): Exercise {
  const requestedType: ExerciseType = questionIndex % 3 === 0
    ? 'dendi-fr'
    : questionIndex % 3 === 1
      ? 'fr-dendi'
      : 'phonetic-fr'
  const type = requestedType === 'phonetic-fr' && !hasLinguisticValue(mot.phonetique) ? 'dendi-fr' : requestedType
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
  const practiceMots = selectEvenly(lesson.mots, practiceCount)
  const testMots = selectEvenly(lesson.mots, testCount)

  return {
    practice: practiceMots.map((mot, index) => createExercise(lesson, mot, index, 'practice')),
    test: testMots.map((mot, index) => createExercise(lesson, mot, index, 'test')),
  }
}

