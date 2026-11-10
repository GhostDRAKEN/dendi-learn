import type { NextConfig } from 'next';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import manifest from './lib/pronunciation-manifest.json';
import { parsePronunciationFilename } from './lib/pronunciation-format';
import type { PronunciationEntry } from './lib/pronunciation';

// Fail dev/build before publishing an invalid recording or a missing local file.
for (const [id, entry] of Object.entries(manifest) as [string, PronunciationEntry][]) {
  if (!/^[1-9]\d*$/.test(id) || !entry || typeof entry !== 'object' ||
      (entry.alternatives !== undefined && !Array.isArray(entry.alternatives))) {
    throw new Error(`Invalid pronunciation entry for word ${id}`);
  }
  const speakers = new Set<string>();
  for (const recording of [entry, ...(entry.alternatives ?? [])]) {
    const filename = typeof recording?.path === 'string' ? recording.path.slice('/audio/dendi/'.length) : '';
    const parsed = parsePronunciationFilename(filename);
    if (!parsed || String(parsed.wordId) !== id || recording.path !== `/audio/dendi/${filename}` ||
        parsed.speakerId !== recording.speakerId || recording.format !== 'wav' || speakers.has(parsed.speakerId)) {
      throw new Error(`Invalid or duplicate pronunciation recording for word ${id}`);
    }
    speakers.add(parsed.speakerId);
    const file = statSync(join(process.cwd(), 'public', recording.path));
    if (!file.isFile() || file.size === 0) throw new Error(`Missing or empty pronunciation for word ${id}`);
  }
}

const nextConfig: NextConfig = {};
export default nextConfig;
