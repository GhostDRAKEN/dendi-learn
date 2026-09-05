"""Read-only local audio inventory and coverage; Python standard library only."""
import argparse
from collections import Counter, defaultdict
import csv
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
NAME = re.compile(r'([1-9][0-9]*)\.(mp3|webm|wav)')


def load_csv(path, required):
    with Path(path).open(encoding='utf-8-sig', newline='') as source:
        reader = csv.DictReader(source)
        if not set(required).issubset(reader.fieldnames or []):
            raise ValueError(f'Colonnes manquantes : {Path(path).name}')
        rows = list(reader)
    if any(None in row or any(row.get(f) is None for f in required) for row in rows):
        raise ValueError(f'CSV mal formé : {Path(path).name}')
    return rows


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'Clé JSON dupliquée : {key}')
        result[key] = value
    return result


def check(inventory, pilot, manifest, audio_dir):
    errors = []
    ids = [row['word_id'] for row in inventory]
    counts = Counter(ids)
    for word_id, count in counts.items():
        if not re.fullmatch(r'[1-9][0-9]*', word_id) or count > 1:
            errors.append(f'ID inventaire non conforme ou dupliqué : {word_id!r}')
    if not inventory:
        errors.append('Inventaire vide.')
    by_id = {row['word_id']: row for row in inventory}
    files = defaultdict(list)
    if not audio_dir.is_dir():
        errors.append(f'Dossier audio absent : {audio_dir}')
    for path in sorted(audio_dir.rglob('*')):
        if path.name == '.gitkeep' and path.parent == audio_dir:
            continue
        if path.is_dir() and not path.is_symlink():
            errors.append(f'Sous-dossier non prévu : {path.relative_to(audio_dir)}')
            continue
        match = NAME.fullmatch(path.name)
        if path.is_symlink() or path.parent != audio_dir or not match:
            errors.append(f'Nom, extension ou chemin non autorisé : {path.relative_to(audio_dir)}')
            continue
        word_id = match[1]
        files[word_id].append(path)
        if word_id not in by_id:
            errors.append(f'ID audio inconnu : {path.name}')
        if path.stat().st_size == 0:
            errors.append(f'Fichier vide : {path.name}')
        if word_id not in manifest:
            errors.append(f'Fichier orphelin (absent du manifeste) : {path.name}')
    for word_id, paths in files.items():
        if len(paths) > 1:
            errors.append(f'Plusieurs fichiers pour ID {word_id} : {", ".join(p.name for p in paths)}')
    integrated = set()
    for word_id, recording in manifest.items():
        if word_id not in by_id:
            errors.append(f'ID manifeste inconnu : {word_id}')
            continue
        if not isinstance(recording, dict):
            errors.append(f'Entrée manifeste non objet : {word_id}')
            continue
        src = recording.get('path', '')
        if not isinstance(src, str) or not re.fullmatch(rf'/audio/dendi/{re.escape(word_id)}\.(mp3|webm|wav)', src):
            errors.append(f'Chemin manifeste non conforme : {word_id}')
            continue
        matches = files.get(word_id, [])
        present = len(matches) == 1 and matches[0].name == src.rsplit('/', 1)[-1] and matches[0].stat().st_size > 0
        if not present:
            errors.append(f'Fichier manifeste absent, vide ou ambigu : {src}')
        row = by_id[word_id]
        validated = recording.get('validated') is True and row.get('linguistic_validated', '').lower() == 'true' and bool(row.get('validated_by', '').strip())
        if not validated:
            errors.append(f'Validation explicite ou relecteur manquant pour ID publié {word_id}')
        if present and validated:
            integrated.add(word_id)
    for row in inventory:
        declared = row.get('audio_file', '')
        if declared:
            match = NAME.fullmatch(declared)
            if not match or match[1] != row['word_id']:
                errors.append(f'audio_file non conforme pour ID {row["word_id"]} : {declared!r}')
            elif not any(p.name == declared and p.stat().st_size > 0 for p in files.get(row['word_id'], [])):
                errors.append(f'Fichier inventaire absent/vide : {declared}')
    missing = []
    pending = []
    pilot_ids = set()
    for row in pilot:
        word_id = row['word_id']
        name = row['expected_filename']
        match = NAME.fullmatch(name)
        if word_id in pilot_ids or word_id not in by_id or not match or match[1] != word_id:
            errors.append(f'Entrée pilote invalide, inconnue ou dupliquée : {word_id} / {name}')
        pilot_ids.add(word_id)
        has_expected = any(p.name == name and p.stat().st_size > 0 for p in files.get(word_id, []))
        if not has_expected:
            missing.append(name)
        if word_id not in integrated or not has_expected:
            pending.append(word_id)
    present_ids = {word_id for word_id, paths in files.items()
                   if word_id in by_id and len(paths) == 1 and paths[0].stat().st_size > 0}
    total = len(by_id)
    lines = ['# Couverture de prononciation', '', f'- Total : {total} mots.',
             f'- Avec fichier local unique et non vide : {len(present_ids)}.',
             f'- Avec audio intégré et validation documentée : {len(integrated)} ({100 * len(integrated) / total if total else 0:.2f} %).',
             '', 'La présence technique ne prouve ni le décodage, ni l’identité du mot, ni la qualité linguistique.',
             'La couverture ci-dessous compte uniquement les fichiers uniques déclarés, non vides et validés explicitement.', '']
    for field in ['niveau', 'categorie']:
        lines += [f'## Couverture par {field}', '', '| Groupe | Total | Audio validé | Couverture |', '| --- | ---: | ---: | ---: |']
        for group in sorted({row[field] for row in inventory}):
            group_ids = {row['word_id'] for row in inventory if row[field] == group}
            count = len(group_ids & integrated)
            label = group.replace('|', '\\|') or '(vide)'
            lines.append(f'| {label} | {len(group_ids)} | {count} | {100 * count / len(group_ids):.2f} % |')
        lines.append('')
    lines += ['## Lot pilote', '', f'{len(pilot_ids)} mots ; {len(missing)} fichiers attendus absents ou vides ; {len(pending)} mots non intégrés/validés.', '']
    lines += [f'- {name}' for name in missing]
    lines += ['', '## Erreurs de cohérence', ''] + ([f'- {error}' for error in errors] or ['Aucune.'])
    lines += ['', 'Les fichiers du pilote manquants sont attendus avant les enregistrements ; --require-pilot les rend bloquants.', '']
    return '\n'.join(lines), errors, pending


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, default=ROOT / 'docs/data/dendi-content-audit.csv')
    parser.add_argument('--pilot', type=Path, default=ROOT / 'docs/data/pronunciation-pilot.csv')
    parser.add_argument('--manifest', type=Path, default=ROOT / 'lib/pronunciation-manifest.json')
    parser.add_argument('--audio-dir', type=Path, default=ROOT / 'public/audio/dendi')
    parser.add_argument('--report', type=Path)
    parser.add_argument('--require-pilot', action='store_true')
    args = parser.parse_args()
    try:
        inventory = load_csv(args.inventory, ['word_id', 'niveau', 'categorie'])
        pilot = load_csv(args.pilot, ['word_id', 'expected_filename'])
        manifest = json.loads(args.manifest.read_text(encoding='utf-8-sig'), object_pairs_hook=unique_object)
        if not isinstance(manifest, dict):
            raise ValueError('Le manifeste doit être un objet JSON.')
        report, errors, pending = check(inventory, pilot, manifest, args.audio_dir)
        if args.report:
            protected = [args.inventory, args.pilot, args.manifest]
            if args.report.resolve() in [p.resolve() for p in protected] or args.report.resolve().is_relative_to(args.audio_dir.resolve()):
                raise ValueError('Le rapport ne peut pas remplacer une entrée ou un asset.')
            args.report.write_text(report, encoding='utf-8')
        print(report)
        return 1 if errors or (args.require_pilot and pending) else 0
    except (OSError, ValueError, csv.Error) as error:
        print(f'Contrôle impossible : {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
