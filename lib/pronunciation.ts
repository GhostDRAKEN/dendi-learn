import manifest from './pronunciation-manifest.json'

export type PronunciationRecording = {
  path: string
  speakerId: string
  format: 'wav'
  speaker?: string
  variant?: string
  source?: string
  recordedAt?: string
  validated?: boolean
}

export type PronunciationEntry = PronunciationRecording & {
  // The top-level recording is the default. Additional speakers are explicit.
  alternatives?: PronunciationRecording[]
}

// Sparse by design: no inferred URLs and no fallback to phonetics or synthesis.
// next.config.ts verifies filenames and recording metadata at dev/build startup.
const recordings = manifest as Readonly<Partial<Record<number, PronunciationEntry>>>

export function getPronunciation(wordId: number, speakerId?: string): PronunciationRecording | undefined {
  const entry = recordings[wordId]
  if (!entry || !speakerId || entry.speakerId === speakerId) return entry
  return entry.alternatives?.find((recording) => recording.speakerId === speakerId)
}
