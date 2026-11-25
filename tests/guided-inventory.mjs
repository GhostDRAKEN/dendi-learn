import fs from 'node:fs/promises'
import { buildCurriculum, flattenLessons } from '../lib/curriculum.ts'

function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++ } else quoted = !quoted
    } else if (c === ',' && !quoted) { row.push(field); field = '' }
    else if (c === '\n' && !quoted) { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  const [columns, ...values] = rows
  return values.map(value => Object.fromEntries(columns.map((key, i) => [key, value[i] ?? ''])))
}
const inventory = parseCSV((await fs.readFile(new URL('../docs/data/dendi-content-audit.csv', import.meta.url), 'utf8')).trimStart())
export const lessons = flattenLessons(buildCurriculum(inventory.map(word => ({ ...word, id: Number(word.word_id) }))))
