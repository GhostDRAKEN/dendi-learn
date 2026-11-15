export function lessonLabel(count: number, completed = false) {
  const plural = count > 1
  return `leçon${plural ? 's' : ''}${completed ? ` terminée${plural ? 's' : ''}` : ''}`
}

export function formatLessonCompletion(completed: number, total: number) {
  return `${completed} ${lessonLabel(completed, true)} sur ${total}`
}

export function getUnitToggleLabel(lessonCount: number, isOpen: boolean) {
  return `${isOpen ? 'Masquer' : 'Voir'} ${lessonCount > 1 ? 'les leçons' : 'la leçon'}`
}

// Describe the existing selection without treating a remembered choice as an assessment.
// This helper only supplies copy; it never selects a lesson or changes progress.
export function getLessonSuggestionCopy({
  lessonId,
  resumeId,
  wordProgressLessonId,
}: {
  lessonId: string | null
  resumeId: string | null
  wordProgressLessonId: string | null
}) {
  if (lessonId && lessonId !== resumeId && lessonId === wordProgressLessonId) {
    return { heading: 'Leçon suggérée', detail: 'Selon vos mots vus ou maîtrisés.' }
  }

  return { heading: 'Votre étape suggérée', detail: null }
}
