import manifest from './pronunciation-manifest.json'

export type PronunciationRecording = {
  path: string
  speaker?: string
  variant?: string
  source?: string
  recordedAt?: string
  validated?: boolean
}

// Sparse by design: no inferred URLs and no fallback to phonetics or synthesis.
const recordings: Readonly<Partial<Record<number, PronunciationRecording>>> = manifest

export function getPronunciation(wordId: number): PronunciationRecording | undefined {
  return recordings[wordId]
}
