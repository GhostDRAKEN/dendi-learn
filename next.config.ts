import type { NextConfig } from "next";
import { statSync } from 'node:fs';
import { join } from 'node:path';
import manifest from './lib/pronunciation-manifest.json';

// Fail dev/build before publishing a declared recording with a missing local file.
for (const [id, recording] of Object.entries(manifest) as [string, { path: string }][]) {
  if (!/^[1-9]\d*$/.test(id) || !new RegExp(`^/audio/dendi/${id}\\.(mp3|webm|wav)$`).test(recording.path)) {
    throw new Error(`Invalid pronunciation path for word ${id}`);
  }
  const file = statSync(join(process.cwd(), 'public', recording.path));
  if (!file.isFile() || file.size === 0) throw new Error(`Missing or empty pronunciation for word ${id}`);
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
