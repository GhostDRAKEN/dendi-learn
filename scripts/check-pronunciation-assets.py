"""Read-only WAV inventory and coverage; technical integration != linguistic validation."""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
NAME = re.compile(r'ddn_([0-9]{3,})_(spk[0-9]{3})\.wav')


def parse_filename(name):
    match = NAME.fullmatch(name)
    if not match:
        return None
    word_id = int(match[1])
    if word_id < 1 or f'{word_id:03d}' != match[1] or match[2] == 'spk000':
        return None
    return str(word_id), match[2]


def expected_filename(word_id, speaker_id):
    name = f'ddn_{int(word_id):03d}_{speaker_id}.wav'
    if not parse_filename(name):
        raise ValueError(f'ID ou speaker ID non conforme : {word_id} / {speaker_id}')
    return name


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


def scan_files(audio_dir, known_ids):
    valid = {}
    errors = []
    hashes = defaultdict(list)
    pairs = set()
    if not audio_dir.is_dir():
        return valid, ['Dossier audio absent.']
    for path in sorted(audio_dir.rglob('*')):
        if path.name == '.gitkeep' and path.parent == audio_dir and not path.is_symlink():
            continue
        if path.is_dir() and not path.is_symlink():
            errors.append(f'Sous-dossier non prévu : {path.relative_to(audio_dir)}')
            continue
        parsed = parse_filename(path.name)
        if path.is_symlink() or path.parent != audio_dir or not parsed:
            errors.append(f'Nom, speaker ID, extension ou chemin non autorisé : {path.relative_to(audio_dir)}')
            continue
        word_id, speaker_id = parsed
        if word_id not in known_ids:
            errors.append(f'ID audio inconnu : {path.name}')
            continue
        if parsed in pairs:
            errors.append(f'Doublon mot/locuteur : {path.name}')
            continue
        pairs.add(parsed)
        if path.stat().st_size == 0:
            errors.append(f'Fichier vide : {path.name}')
            continue
        try:
            # Current corpus uses PCM. Check a real WAV header and complete frames.
            with wave.open(str(path), 'rb') as audio:
                frames = audio.getnframes()
                expected = frames * audio.getnchannels() * audio.getsampwidth()
                if not frames or len(audio.readframes(frames)) != expected:
                    raise ValueError('données audio vides ou tronquées')
        except (wave.Error, EOFError, ValueError) as error:
            errors.append(f'WAV illisible ou non PCM pris en charge : {path.name} ({error})')
            continue
        hashes[hashlib.sha256(path.read_bytes()).hexdigest()].append(path.name)
        valid[path.name] = parsed
    for names in hashes.values():
        if len(names) > 1:
            errors.append(f'Doublon exact de contenu audio : {", ".join(names)}')
    return valid, errors


def manifest_recordings(word_id, entry, errors):
    if not isinstance(entry, dict):
        errors.append(f'Entrée manifeste non objet : {word_id}')
        return []
    alternatives = entry.get('alternatives', [])
    if not isinstance(alternatives, list):
        errors.append(f'Alternatives non valides : {word_id}')
        return []
    result = []
    speakers = set()
    for recording in [entry, *alternatives]:
        if not isinstance(recording, dict):
            errors.append(f'Enregistrement manifeste non objet : {word_id}')
            continue
        src = recording.get('path')
        name = src.removeprefix('/audio/dendi/') if isinstance(src, str) else ''
        parsed = parse_filename(name)
        if not parsed or parsed[0] != word_id or src != f'/audio/dendi/{name}':
            errors.append(f'Chemin manifeste non conforme pour ID {word_id} : {src!r}')
            continue
        if recording.get('speakerId') != parsed[1] or recording.get('format') != 'wav':
            errors.append(f'speakerId ou format incohérent : {name}')
            continue
        if parsed[1] in speakers:
            errors.append(f'Doublon exact mot/locuteur dans le manifeste : {name}')
            continue
        speakers.add(parsed[1])
        if 'validated' in recording and type(recording['validated']) is not bool:
            errors.append(f'validated doit être un booléen : {name}')
        result.append((name, recording))
    return result


def check(inventory, pilot, manifest, audio_dir):
    ids = [row['word_id'] for row in inventory]
    errors = [f'ID inventaire non conforme ou dupliqué : {word_id!r}'
              for word_id, count in Counter(ids).items()
              if not re.fullmatch(r'[1-9][0-9]*', word_id) or count > 1]
    if not inventory:
        errors.append('Inventaire vide.')
    by_id = {row['word_id']: row for row in inventory}
    files, file_errors = scan_files(audio_dir, by_id)
    errors.extend(file_errors)
    declared = set()
    integrated_files = set()
    validated_files = set()
    integrated = set()
    validated = set()
    for word_id, entry in manifest.items():
        if word_id not in by_id:
            errors.append(f'ID manifeste inconnu : {word_id}')
            continue
        recordings = manifest_recordings(word_id, entry, errors)
        for index, (name, recording) in enumerate(recordings):
            if name in declared:
                errors.append(f'Chemin déclaré plusieurs fois : {name}')
            declared.add(name)
            if name not in files:
                errors.append(f'Fichier manifeste absent, vide ou invalide : {name}')
                continue
            integrated_files.add(name)
            row = by_id[word_id]
            documented = row.get('linguistic_validated', '').strip().lower() == 'true' and bool(row.get('validated_by', '').strip())
            if recording.get('validated') is True and not documented:
                errors.append(f'Validation annoncée sans documentation/relecteur pour ID {word_id}')
            is_validated = recording.get('validated') is True and documented
            if is_validated:
                validated_files.add(name)
            # Coverage of the UI uses the top-level/default recording only.
            if index == 0 and name == entry.get('path', '').rsplit('/', 1)[-1]:
                integrated.add(word_id)
                if is_validated:
                    validated.add(word_id)
    for name in files.keys() - declared:
        errors.append(f'Fichier orphelin (absent du manifeste) : {name}')
    for row in inventory:
        name = row.get('audio_file', '')
        if name:
            parsed = parse_filename(name)
            if not parsed or parsed[0] != row['word_id']:
                errors.append(f'audio_file non conforme pour ID {row["word_id"]} : {name!r}')
            elif name not in files:
                errors.append(f'Fichier inventaire absent/vide/invalide : {name}')
    pending = []
    pilot_ids = set()
    pilot_lines = []
    for row in pilot:
        word_id = row['word_id']
        name = row['expected_filename']
        parsed = parse_filename(name)
        if word_id in pilot_ids or word_id not in by_id or not parsed or parsed[0] != word_id:
            errors.append(f'Entrée pilote invalide, inconnue ou dupliquée : {word_id} / {name}')
        pilot_ids.add(word_id)
        present = name in files
        included = name in integrated_files
        reviewed = name in validated_files
        if not present or not included:
            pending.append(word_id)
        pilot_lines.append(f'| {word_id} | {name} | {"oui" if present else "non"} | {"oui" if included else "non"} | {"oui" if reviewed else "non documentée"} |')
    present_ids = {word_id for word_id, _ in files.values()}
    total = len(by_id)
    pct = lambda count, size: f'{100 * count / size if size else 0:.2f} %'
    lines = ['# Couverture de prononciation', '',
             f'- Total : {total} mots.',
             f'- Fichiers WAV lisibles et non vides : {len(files)} ; mots avec fichier : {len(present_ids)}.',
             f'- Mots intégrés (enregistrement par défaut) : {len(integrated)} ({pct(len(integrated), total)}).',
             f'- Mots avec validation linguistique documentée de cet enregistrement : {len(validated)} ({pct(len(validated), total)}).',
             '', 'Présence, intégration et validation sont trois états distincts. La lecture technique ne valide pas la langue.',
             'Les métadonnées de validation sont déclaratives : aucune validation humaine n’est déduite du nom de fichier.', '']
    for field in ['niveau', 'categorie']:
        lines += [f'## Couverture par {field}', '', '| Groupe | Total | Fichier présent | Intégré | Validation documentée | Couverture technique |', '| --- | ---: | ---: | ---: | ---: | ---: |']
        for group in sorted({row[field] for row in inventory}):
            group_ids = {row['word_id'] for row in inventory if row[field] == group}
            label = group.replace('|', '\\|') or '(vide)'
            count = len(group_ids & integrated)
            lines.append(f'| {label} | {len(group_ids)} | {len(group_ids & present_ids)} | {count} | {len(group_ids & validated)} | {pct(count, len(group_ids))} |')
        lines.append('')
    lines += ['## Lot pilote', '', f'{len(pilot_ids)} mots ; {len(pending)} fichiers attendus absents ou non intégrés.', '',
              '| ID | Fichier attendu | Présent | Intégré | Validation linguistique |',
              '| --- | --- | --- | --- | --- |', *pilot_lines, '',
              '## Erreurs de cohérence', '']
    lines += [f'- {error}' for error in errors] or ['Aucune.']
    lines += ['', '`--require-pilot` exige la présence et l’intégration technique du lot. '
              '`--require-validation` exige en plus la validation documentée de tous les enregistrements intégrés.', '']
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
    parser.add_argument('--require-validation', action='store_true')
    args = parser.parse_args()
    try:
        inventory = load_csv(args.inventory, ['word_id', 'niveau', 'categorie'])
        pilot = load_csv(args.pilot, ['word_id', 'expected_filename'])
        manifest = json.loads(args.manifest.read_text(encoding='utf-8-sig'), object_pairs_hook=unique_object)
        if not isinstance(manifest, dict):
            raise ValueError('Le manifeste doit être un objet JSON.')
        report, errors, pending = check(inventory, pilot, manifest, args.audio_dir)
        if args.require_validation:
            by_id = {row['word_id']: row for row in inventory}
            for word_id, entry in manifest.items():
                row = by_id.get(word_id, {})
                for name, recording in manifest_recordings(word_id, entry, []):
                    if recording.get('validated') is not True or row.get('linguistic_validated', '').strip().lower() != 'true' or not row.get('validated_by', '').strip():
                        errors.append(f'Validation linguistique non documentée : {name}')
            if errors:
                report += '\n## Contrôle strict de validation\n\n' + '\n'.join(f'- {error}' for error in errors) + '\n'
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
