"""Generate the pronunciation manifest from real local WAVs; never infer validation."""
import argparse
from collections import defaultdict
import importlib.util
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pronunciation_assets', Path(__file__).with_name('check-pronunciation-assets.py'))
assets = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets)


def build_manifest(files, previous, default_speaker=None):
    groups = defaultdict(list)
    for name, (word_id, speaker_id) in files.items():
        groups[word_id].append((name, speaker_id))
    result = {}
    for word_id in sorted(groups, key=int):
        old_entry = previous.get(word_id)
        old_errors = []
        old_recordings = assets.manifest_recordings(word_id, old_entry, old_errors) if old_entry is not None else []
        if old_errors:
            raise ValueError('; '.join(old_errors))
        known = {name: recording for name, recording in old_recordings}
        recordings = []
        for name, speaker_id in sorted(groups[word_id]):
            recording = {key: value for key, value in known.get(name, {}).items() if key != 'alternatives'}
            recording.update(path=f'/audio/dendi/{name}', speakerId=speaker_id, format='wav')
            recordings.append(recording)
        old_path = old_entry.get('path') if old_entry else None
        primary = next((r for r in recordings if r['path'] == old_path), None)
        if primary is None and default_speaker:
            primary = next((r for r in recordings if r['speakerId'] == default_speaker), None)
        if primary is None:
            if len(recordings) != 1:
                raise ValueError(f'Plusieurs locuteurs pour ID {word_id} : choisir --default-speaker, sans choix implicite.')
            primary = recordings[0]
        alternatives = [r for r in recordings if r is not primary]
        result[word_id] = {**primary, **({'alternatives': alternatives} if alternatives else {})}
    stale = set(previous) - set(result)
    if stale:
        raise ValueError(f'Entrées existantes sans fichier : {", ".join(sorted(stale))}. Vérifier manuellement.')
    return result


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, default=ROOT / 'docs/data/dendi-content-audit.csv')
    parser.add_argument('--audio-dir', type=Path, default=ROOT / 'public/audio/dendi')
    parser.add_argument('--output', type=Path, default=ROOT / 'lib/pronunciation-manifest.json')
    parser.add_argument('--default-speaker')
    args = parser.parse_args()
    if args.default_speaker and (not re.fullmatch(r'spk[0-9]{3}', args.default_speaker) or args.default_speaker == 'spk000'):
        parser.error('Speaker ID attendu : spk001 à spk999.')
    try:
        rows = assets.load_csv(args.inventory, ['word_id', 'niveau', 'categorie'])
        ids = [row['word_id'] for row in rows]
        if len(set(ids)) != len(ids):
            raise ValueError('IDs inventaire dupliqués.')
        if args.output.resolve() == args.inventory.resolve() or args.output.resolve().is_relative_to(args.audio_dir.resolve()):
            raise ValueError('Le manifeste ne peut pas remplacer une entrée ou un asset.')
        previous = json.loads(args.output.read_text(encoding='utf-8-sig'), object_pairs_hook=assets.unique_object) if args.output.exists() else {}
        if not isinstance(previous, dict):
            raise ValueError('Le manifeste doit être un objet JSON.')
        files, errors = assets.scan_files(args.audio_dir, set(ids))
        if errors:
            raise ValueError('; '.join(errors))
        manifest = build_manifest(files, previous, args.default_speaker)
        _, errors, _ = assets.check(rows, [], manifest, args.audio_dir)
        if errors:
            raise ValueError('; '.join(errors))
        args.output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{len(manifest)} IDs et {len(files)} fichiers déclarés. Aucune validation linguistique déduite.')
        return 0
    except (OSError, ValueError) as error:
        print(f'Génération refusée : {error}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
