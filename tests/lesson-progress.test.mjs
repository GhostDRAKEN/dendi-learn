import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildCurriculum, getRecommendedLesson } from '../lib/curriculum.ts'
import {
  getLessonProgressSnapshot, getParcoursProgress, getRecordedLessonState,
  isLessonProgressPersistent, lessonProgressKey, parseLessonRecords,
  recordLessonEvent, subscribeToLessonProgress, updateLessonRecords,
} from '../lib/lesson-progress.ts'

// Test fixtures only: no production linguistic data or Supabase writes.
let wordId = 0
const words = (count, categorie, niveau) => Array.from({length:count}, () => ({
  id:++wordId, fr:'Fixture', dendi:'Fixture', phonetique:'', categorie, niveau,
}))
const curriculum = buildCurriculum([
  ...words(19,'Salutations','debutant'), ...words(9,'temps__journee','debutant'),
  ...words(6,'couleurs','debutant'), ...words(7,'verbes','intermediaire'), ...words(7,'corps','avance'),
])
const section = curriculum[0]
const lessons = section.units.flatMap(unit => unit.lessons)
const t1 = '2026-11-15T08:00:00.000Z', t2 = '2026-11-15T08:10:00.000Z', t3 = '2026-11-15T08:20:00.000Z'
const overview = (records, resume=null, recommended=lessons[0].id) => getParcoursProgress(section,records,resume,recommended)
const complete = (records, lesson) => updateLessonRecords(records,lesson.id,'completed',t2)

test('first visit and legacy resume are recommendations, not proof of starting', () => {
  assert.equal(overview({}).completed,0)
  assert.equal(overview({}).lesson.id,lessons[0].id)
  assert.equal(overview({},lessons[1].id).lesson.id,lessons[1].id)
  assert.equal(getRecordedLessonState(undefined),'not-started')
  assert.equal(overview({},lessons[1].id).percent,0)
})

test('all words seen or mastered never count as a completed lesson', () => {
  for (const maitrise of [false,true]) {
    const progression = lessons[0].mots.map(mot=>({mot_id:mot.id,vu:true,maitrise}))
    const recommended = getRecommendedLesson(curriculum,'debutant',progression)
    assert.equal(overview({},null,recommended.id).completed,0)
  }
})

test('only recorded events determine states; most recently resumed unfinished lesson takes precedence', () => {
  let records = updateLessonRecords({},lessons[0].id,'started',t1)
  assert.equal(getRecordedLessonState(records[lessons[0].id]),'in-progress')
  assert.equal(overview(records,lessons[2].id).lesson.id,lessons[0].id)
  records = updateLessonRecords(records,lessons[1].id,'started',t2)
  assert.equal(overview(records).lesson.id,lessons[1].id)
  records = updateLessonRecords(records,lessons[0].id,'started',t3)
  assert.equal(overview(records).lesson.id,lessons[0].id)
  assert.equal(records[lessons[0].id].startedAt,t1)
  assert.equal(overview(records).completed,0)
})

test('completion survives serialization, refresh, replay and repeated completion', () => {
  let records = updateLessonRecords({},lessons[0].id,'started',t1)
  records = complete(records,lessons[0])
  records = parseLessonRecords(JSON.stringify({version:1,lessons:records}))
  assert.equal(getRecordedLessonState(records[lessons[0].id]),'completed')
  assert.equal(overview(records).completed,1)
  assert.equal(overview(records,lessons[1].id).lesson.id,lessons[1].id)
  records = updateLessonRecords(records,lessons[0].id,'started',t3)
  records = updateLessonRecords(records,lessons[0].id,'completed',t3)
  assert.equal(records[lessons[0].id].completedAt,t2)
  assert.equal(overview(records).completed,1)
})

test('multiple completions, full level and level changes use each level denominator', () => {
  let records = lessons.slice(0,2).reduce(complete,{})
  assert.equal(overview(records).completed,2)
  assert.equal(overview(records).total,6)
  assert.ok(Math.abs(overview(records).percent - 100/3) < 1e-10)
  records = lessons.reduce(complete,records)
  assert.equal(overview(records).percent,100)
  assert.equal(overview(records).lesson,null)
  const nextSection = curriculum[1]
  const next = getParcoursProgress(nextSection,records,lessons[0].id,lessons[0].id)
  assert.equal(next.completed,0)
  assert.equal(next.total,1)
  assert.equal(next.lesson.niveau,'intermediaire')
  assert.equal(overview(records).completed,6)
})

test('unknown lessons and a recommendation from another level cannot inflate completion or leave the selected level', () => {
  const records = updateLessonRecords({},'unknown-lesson-01','completed',t1)
  const result = overview(records,'unknown-lesson-01',curriculum[1].units[0].lessons[0].id)
  assert.equal(result.completed,0)
  assert.equal(result.lesson.niveau,'debutant')
  assert.equal(getParcoursProgress({...section,units:[]},records,null,'unknown').percent,0)
})

test('malformed local history does not create a completion', () => {
  for (const raw of [null,'broken','null','[]','{"version":2,"lessons":{}}']) assert.deepEqual(parseLessonRecords(raw),{})
  const records = parseLessonRecords(JSON.stringify({version:1,lessons:{
    [lessons[0].id]:{startedAt:t1,updatedAt:t2,completedAt:'true'},
    [lessons[1].id]:{startedAt:t2,updatedAt:t2,completedAt:t1},
    [lessons[2].id]:{completedAt:t2},
    '__proto__':{startedAt:t1,updatedAt:t1,completedAt:t2},
  }}))
  assert.equal(overview(records).completed,0)
  assert.equal(records[lessons[2].id],undefined)
})

function withWindow(run) {
  const previous = globalThis.window
  const data = new Map()
  const events = new EventTarget()
  globalThis.window = {
    localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},
    addEventListener:events.addEventListener.bind(events),
    removeEventListener:events.removeEventListener.bind(events),
    dispatchEvent:events.dispatchEvent.bind(events),
  }
  try { run(data) } finally { globalThis.window = previous }
}

test('guest, signed-in account and another account have isolated histories, without remote writes', () => withWindow(() => {
  let notifications=0
  const unsubscribe=subscribeToLessonProgress(()=>notifications++)
  recordLessonEvent(lessons[0].id,null,'started')
  recordLessonEvent(lessons[0].id,null,'completed')
  assert.equal(overview(parseLessonRecords(getLessonProgressSnapshot(null))).completed,1)
  assert.equal(overview(parseLessonRecords(getLessonProgressSnapshot('account-a'))).completed,0)
  recordLessonEvent(lessons[1].id,'account-a','started')
  recordLessonEvent(lessons[1].id,'account-a','completed')
  assert.equal(overview(parseLessonRecords(getLessonProgressSnapshot('account-a'))).completed,1)
  assert.equal(getLessonProgressSnapshot('account-b'),'')
  assert.notEqual(lessonProgressKey(null),lessonProgressKey('account-a'))
  assert.equal(notifications,4)
  unsubscribe()
}))

test('storage denial permits session-only tracking and local deletion is respected', () => withWindow(data => {
  const account='storage-test'
  recordLessonEvent(lessons[0].id,account,'started')
  data.delete(lessonProgressKey(account))
  assert.equal(getLessonProgressSnapshot(account),'')
  window.localStorage.setItem=()=>{throw Error('blocked')}
  recordLessonEvent(lessons[0].id,account,'started')
  recordLessonEvent(lessons[0].id,account,'completed')
  assert.equal(overview(parseLessonRecords(getLessonProgressSnapshot(account))).completed,1)
  assert.equal(isLessonProgressPersistent(account),false)
}))
