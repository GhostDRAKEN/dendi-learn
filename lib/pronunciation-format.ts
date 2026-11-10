/** Canonical public filename, keyed by the numeric ID of the lexical corpus. */
export function parsePronunciationFilename(filename: string) {
  const match = /^ddn_(\d{3,})_(spk\d{3})\.wav$/.exec(filename)
  if (!match) return null
  const wordId = Number(match[1])
  if (!Number.isSafeInteger(wordId) || wordId < 1 || String(wordId).padStart(3, '0') !== match[1]) return null
  if (match[2] === 'spk000') return null
  return { wordId, speakerId: match[2], format: 'wav' as const }
}
