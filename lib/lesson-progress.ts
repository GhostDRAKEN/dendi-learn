import type { CurriculumLesson, CurriculumSection } from './curriculum'

// Lesson completion is independent of word discovery/mastery in Supabase.
export type LessonRecord = { startedAt: string; updatedAt: string; completedAt?: string }
export type LessonRecords = Record<string, LessonRecord>
export type LessonState = 'not-started' | 'in-progress' | 'completed'
export const LESSON_PROGRESS_EVENT = 'dendi-lesson-progress'

export function lessonProgressKey(userId: string | null) {
  return `dendi-guided-lessons:v1:${userId ? `user:${userId}` : 'guest'}`
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

export function parseLessonRecords(raw: string | null): LessonRecords {
  try {
    const data = JSON.parse(raw ?? '{}')
    if (data?.version !== 1 || !data.lessons || typeof data.lessons !== 'object' || Array.isArray(data.lessons)) return {}
    const records: LessonRecords = {}
    for (const [id, value] of Object.entries(data.lessons)) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(id) || !value || typeof value !== 'object') continue
      const record = value as Partial<LessonRecord>
      if (!isDate(record.startedAt) || !isDate(record.updatedAt)) continue
      records[id] = { startedAt: record.startedAt, updatedAt: record.updatedAt }
      if (isDate(record.completedAt) && Date.parse(record.completedAt) >= Date.parse(record.startedAt)) {
        records[id].completedAt = record.completedAt
      }
    }
    return records
  } catch {
    return {}
  }
}

export function getRecordedLessonState(record?: LessonRecord): LessonState {
  return record?.completedAt ? 'completed' : record ? 'in-progress' : 'not-started'
}

export function updateLessonRecords(records: LessonRecords, lessonId: string, event: 'started' | 'completed', now: string): LessonRecords {
  const previous = records[lessonId]
  return {
    ...records,
    [lessonId]: {
      startedAt: previous?.startedAt ?? now,
      updatedAt: now,
      ...(previous?.completedAt ? { completedAt: previous.completedAt } : event === 'completed' ? { completedAt: now } : {}),
    },
  }
}

export function getParcoursProgress(section: CurriculumSection, records: LessonRecords, resumeId: string | null, recommendedId: string) {
  const lessons = section.units.flatMap(unit => unit.lessons)
  const completed = lessons.filter(lesson => getRecordedLessonState(records[lesson.id]) === 'completed').length
  const pending = lessons.filter(lesson => getRecordedLessonState(records[lesson.id]) !== 'completed')
  const inProgress = pending
    .filter(lesson => getRecordedLessonState(records[lesson.id]) === 'in-progress')
    .sort((a, b) => Date.parse(records[b.id].updatedAt) - Date.parse(records[a.id].updatedAt))
  const lesson: CurriculumLesson | null = inProgress[0]
    ?? pending.find(item => item.id === resumeId)
    ?? pending.find(item => item.id === recommendedId)
    ?? pending[0]
    ?? null
  return { lesson, completed, total: lessons.length, percent: lessons.length ? (completed / lessons.length) * 100 : 0 }
}

// A blocked localStorage still permits tracking within the current tab, without
// claiming that it will survive a reload. Never mix a guest and an account.
const volatileSnapshots = new Map<string, string>()
const volatileOnly = new Set<string>()

export function getLessonProgressSnapshot(userId: string | null): string {
  const key = lessonProgressKey(userId)
  if (volatileOnly.has(key)) return volatileSnapshots.get(key) ?? ''
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    volatileOnly.add(key)
    return volatileSnapshots.get(key) ?? ''
  }
}

export function isLessonProgressPersistent(userId: string | null) {
  return !volatileOnly.has(lessonProgressKey(userId))
}

export function subscribeToLessonProgress(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(LESSON_PROGRESS_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(LESSON_PROGRESS_EVENT, callback)
  }
}

export function recordLessonEvent(lessonId: string, userId: string | null, event: 'started' | 'completed') {
  const records = updateLessonRecords(parseLessonRecords(getLessonProgressSnapshot(userId)), lessonId, event, new Date().toISOString())
  const raw = JSON.stringify({ version: 1, lessons: records })
  const key = lessonProgressKey(userId)
  volatileSnapshots.set(key, raw)
  try {
    window.localStorage.setItem(key, raw)
    volatileOnly.delete(key)
  } catch {
    volatileOnly.add(key)
  }
  window.dispatchEvent(new Event(LESSON_PROGRESS_EVENT))
}
