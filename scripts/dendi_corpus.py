"""Dendi corpus derivation, standard library only. Never writes production sources."""
from collections import Counter, defaultdict
import csv
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import unicodedata
import wave

ROOT = Path(__file__).resolve().parents[1]
SEED = 42
PARALLEL_FIELDS = ['sentence_id', 'fr', 'dendi', 'source', 'variant_region', 'validated', 'validated_by', 'notes']
LEX_FIELDS = ['word_id', 'fr', 'dendi', 'phonetique', 'categorie', 'niveau', 'variant_region', 'source',
              'linguistic_validated', 'validated_by', 'needs_review', 'review_reasons', 'phonetic_status', 'has_audio', 'audio_count']
SPEECH_FIELDS = ['utterance_id', 'word_id', 'fr', 'dendi', 'phonetique', 'speaker_id', 'audio_path', 'audio_format',
                 'linguistic_validated', 'variant_region', 'duration_seconds', 'sample_rate', 'channels', 'file_size_bytes',
                 'needs_review', 'review_reasons', 'phonetic_status']
INPUTS = ['docs/data/dendi-content-audit.csv', 'docs/data/pronunciation-pilot.csv', 'lib/pronunciation-manifest.json']


def load_tool(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    tool = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(tool)
    return tool


audit = load_tool('audit-dendi-content')
assets = load_tool('check-pronunciation-assets')


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def text_sha256(path):
    # Git may check text out as CRLF. Preserve content/Unicode; canonicalize EOLs only.
    return sha256(Path(path).read_bytes().replace(b'\r\n', b'\n'))


def comparison_key(value):
    # Comparison only. Exported lexical strings retain the source code points/spaces.
    return ' '.join(unicodedata.normalize('NFC', value).split()).casefold()


def pair_key(row):
    return comparison_key(row['fr']) + '\0' + comparison_key(row['dendi'])


def optional(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError('Métadonnée textuelle non conforme.')
    return None if value == 'N/A' or not value.strip() else value


def exclusion_reasons(row):
    reasons = []
    for field in ['fr', 'dendi']:
        if row[field] == 'N/A':
            reasons.append(field + ':exact_N/A')
        elif not row[field].strip():
            reasons.append(field + ':empty')
    return reasons


def documented_word_validation(row):
    value = row.get('linguistic_validated', '').strip().lower()
    if value == 'false':
        return False
    if value == 'true' and optional(row.get('validated_by', '')) is not None:
        return True
    return None


def review_flags(rows):
    flags = defaultdict(set)
    findings = audit.anomalies(rows)
    kinds = {'Phonétiques partagées': 'shared_phonetic',
             'Formes Dendi avec traductions différentes': 'dendi_multiple_translations',
             'Doublons lexicaux exacts (hors ID)': 'exact_lexical_duplicate',
             'Champs vides': 'empty_source_field',
             'Caractères ou espaces à vérifier': 'source_characters_or_placeholder'}
    for kind, _, ids, _ in findings:
        for word_id in ids:
            flags[word_id].add(kinds.get(kind, 'source_structure'))
    for field, other, code in [('fr', 'dendi', 'fr_multiple_forms'), ('dendi', 'fr', 'dendi_multiple_translations')]:
        groups = defaultdict(list)
        for row in rows:
            groups[comparison_key(row[field])].append(row)
        for members in groups.values():
            if len({comparison_key(r[other]) for r in members}) > 1:
                for row in members:
                    flags[row['word_id']].add(code)
    pairs = defaultdict(list)
    for row in rows:
        pairs[pair_key(row)].append(row)
        word_id = row['word_id']
        if '/' in row['fr'] or '/' in row['dendi']:
            flags[word_id].add('possible_variant_separator')
        if optional(row.get('variant_region', '')) is not None:
            flags[word_id].add('regional_variant_recorded')
        if optional(row['phonetique']) is None:
            flags[word_id].add('phonetic_missing_or_placeholder')
        if row.get('linguistic_validated', '').strip().lower() == 'true' and documented_word_validation(row) is not True:
            flags[word_id].add('validation_without_reviewer')
    for members in pairs.values():
        if len(members) > 1:
            for row in members:
                flags[row['word_id']].add('duplicate_lexical_pair')
    return flags, findings


def lexical_splits(rows, seed=SEED):
    groups = defaultdict(list)
    for row in rows:
        groups[pair_key(row)].append(row)
    keys = sorted(groups, key=lambda key: (sha256(f'{seed}\0{key}'.encode('utf-8')), key))
    train_end = int(len(keys) * .8)
    validation_end = train_end + int(len(keys) * .1)
    splits = {'train': [], 'validation': [], 'test': []}
    for index, key in enumerate(keys):
        label = 'train' if index < train_end else 'validation' if index < validation_end else 'test'
        splits[label].extend(groups[key])
    return {name: sorted(members, key=lambda row: row['word_id']) for name, members in splits.items()}


def derive(root=ROOT, seed=SEED):
    root = Path(root).resolve()
    source = audit.read_inventory(root / INPUTS[0])
    ids = [row['word_id'] for row in source]
    if not source or len(ids) != len(set(ids)) or any(not re.fullmatch(r'[1-9][0-9]*', word_id) for word_id in ids):
        raise ValueError('Inventaire vide ou IDs invalides/dupliqués : aucun export.')
    by_id = {row['word_id']: row for row in source}
    pilot = assets.load_csv(root / INPUTS[1], ['word_id', 'expected_filename'])
    if len(pilot) != len({row['word_id'] for row in pilot}) or any(row['word_id'] not in by_id for row in pilot):
        raise ValueError('IDs pilote inconnus ou dupliqués.')
    manifest = json.loads((root / INPUTS[2]).read_text(encoding='utf-8-sig'), object_pairs_hook=assets.unique_object)
    if not isinstance(manifest, dict):
        raise ValueError('Manifeste non objet.')
    flags, findings = review_flags(source)
    excluded = [dict(word_id=int(row['word_id']), fr=row['fr'], dendi=row['dendi'], reasons=exclusion_reasons(row))
                for row in source if exclusion_reasons(row)]
    excluded_ids = {row['word_id'] for row in excluded}
    recordings = defaultdict(list)
    audio_provenance = []
    seen_paths = set()
    for word_id in sorted(manifest, key=lambda value: int(value) if value.isdecimal() else -1):
        if word_id not in by_id:
            raise ValueError(f'ID manifeste inconnu : {word_id}')
        errors = []
        entries = assets.manifest_recordings(word_id, manifest[word_id], errors)
        if errors or not entries:
            raise ValueError('; '.join(errors) or f'Aucun enregistrement pour ID {word_id}')
        for name, metadata in entries:
            if name in seen_paths:
                raise ValueError(f'Audio dupliqué dans le manifeste : {name}')
            seen_paths.add(name)
            path = root / 'public/audio/dendi' / name
            if path.is_symlink() or not path.is_file() or path.stat().st_size == 0:
                raise ValueError(f'Audio absent, vide ou lien non autorisé : {name}')
            try:
                with wave.open(str(path), 'rb') as audio:
                    frames, rate = audio.getnframes(), audio.getframerate()
                    channels, width = audio.getnchannels(), audio.getsampwidth()
                    if not frames or len(audio.readframes(frames)) != frames * channels * width:
                        raise ValueError(f'WAV vide ou tronqué : {name}')
            except (wave.Error, EOFError) as error:
                raise ValueError(f'WAV non lisible : {name}') from error
            item = dict(utterance_id=Path(name).stem, word_id=int(word_id), speaker_id=metadata['speakerId'],
                        audio_path=f'public/audio/dendi/{name}', audio_format=metadata['format'],
                        duration_seconds=round(frames / rate, 6), sample_rate=rate, channels=channels,
                        file_size_bytes=path.stat().st_size)
            word_validated = documented_word_validation(by_id[word_id])
            if metadata.get('validated') is True and word_validated is not True:
                flags[word_id].add('audio_validation_without_documentation')
            item['linguistic_validated'] = True if metadata.get('validated') is True and word_validated is True else False if metadata.get('validated') is False or word_validated is False else None
            variant = optional(metadata.get('variant', '')) or optional(by_id[word_id].get('variant_region', ''))
            item['variant_region'] = variant
            recordings[word_id].append(item)
            audio_provenance.append(dict(audio_path=item['audio_path'], sha256=sha256(path.read_bytes()),
                                         excluded_from_speech=int(word_id) in excluded_ids))
    lexicon, speech = [], []
    for row in sorted(source, key=lambda item: int(item['word_id'])):
        if int(row['word_id']) in excluded_ids:
            continue
        word_id = row['word_id']
        phonetic = optional(row['phonetique'])
        status = 'present' if phonetic is not None else 'placeholder_na' if row['phonetique'] == 'N/A' else 'missing'
        reasons = sorted(flags[word_id])
        word_audio = recordings.get(word_id, [])
        lexicon.append(dict(word_id=int(word_id), fr=row['fr'], dendi=row['dendi'], phonetique=phonetic,
                            categorie=row['categorie'], niveau=row['niveau'], variant_region=optional(row.get('variant_region', '')),
                            source=optional(row.get('source', '')), linguistic_validated=documented_word_validation(row),
                            validated_by=optional(row.get('validated_by', '')), needs_review=bool(reasons),
                            review_reasons=reasons, phonetic_status=status, has_audio=bool(word_audio), audio_count=len(word_audio)))
        for audio in word_audio:
            speech.append({**audio, 'fr': row['fr'], 'dendi': row['dendi'], 'phonetique': phonetic,
                           'needs_review': bool(reasons), 'review_reasons': reasons, 'phonetic_status': status})
    speech.sort(key=lambda item: (item['word_id'], item['speaker_id']))
    splits = lexical_splits(lexicon, seed)
    review = [dict(word_id=row['word_id'], review_reasons=row['review_reasons']) for row in lexicon if row['needs_review']]
    summary = dict(source_entries=len(source), excluded_na=sum(any(reason.endswith(':exact_N/A') for reason in row['reasons']) for row in excluded),
                   excluded_empty=sum(any(reason.endswith(':empty') for reason in row['reasons']) for row in excluded),
                   excluded_total=len(excluded), lexical_entries=len(lexicon), with_phonetic=sum(r['phonetique'] is not None for r in lexicon),
                   without_phonetic=sum(r['phonetique'] is None for r in lexicon), words_with_audio=sum(r['has_audio'] for r in lexicon),
                   audio_count=len(speech), manifest_audio_count=len(seen_paths), speaker_count=len({r['speaker_id'] for r in speech}),
                   audio_coverage_percent=round(100 * sum(r['has_audio'] for r in lexicon) / len(lexicon), 4) if lexicon else 0,
                   linguistically_validated=sum(r['linguistic_validated'] is True for r in lexicon), needs_review=len(review),
                   split_seed=seed, splits={name: len(rows) for name, rows in splits.items()})
    provenance = dict(schema_version='0.1', split_seed=seed, text_hash_line_endings='LF',
                      source_files=[dict(path=name, sha256=text_sha256(root / name)) for name in INPUTS],
                      pipeline_files=[dict(path='scripts/' + name, sha256=text_sha256(Path(__file__).with_name(name)))
                                      for name in ['dendi_corpus.py', 'audit-dendi-content.py', 'check-pronunciation-assets.py']],
                      audio_files=audio_provenance,
                      unreferenced_wav_files=sorted(p.name for p in (root / 'public/audio/dendi').glob('*.wav') if p.name not in seen_paths))
    return dict(lexicon=lexicon, speech=speech, splits=splits, excluded=excluded, review=review,
                findings=findings, summary=summary, provenance=provenance)


def csv_value(value):
    if value is None:
        return ''
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, list):
        return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    return str(value)


def csv_bytes(rows, fields):
    buffer = io.StringIO(newline='')
    writer = csv.DictWriter(buffer, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows({key: csv_value(row.get(key)) for key in fields} for row in rows)
    return buffer.getvalue().encode('utf-8')


def jsonl_bytes(rows, fields=None):
    return ''.join(json.dumps({key: row[key] for key in fields} if fields else row, ensure_ascii=False, separators=(',', ':')) + '\n' for row in rows).encode('utf-8')


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def summary_markdown(data):
    summary = data['summary']
    labels = [('Entrées source', 'source_entries'), ('Entrées exclues pour N/A', 'excluded_na'),
              ('Entrées exclues pour champs essentiels vides', 'excluded_empty'), ('Entrées lexicales exploitables', 'lexical_entries'),
              ('Entrées avec phonétique', 'with_phonetic'), ('Entrées sans phonétique', 'without_phonetic'),
              ('Mots avec au moins un audio', 'words_with_audio'), ("Nombre total d'audios", 'audio_count'),
              ('Nombre de locuteurs techniques', 'speaker_count'), ('Couverture audio', 'audio_coverage_percent'),
              ('Entrées linguistiquement validées', 'linguistically_validated'), ('Entrées à revoir', 'needs_review')]
    lines = ['# Corpus Dendi v0.1', '', 'Rapport dérivé reproductible. Les sources de production sont lues sans modification.', '']
    lines += [f'- {label} : {summary[key]}{" %" if key == "audio_coverage_percent" else ""}' for label, key in labels]
    lines += ['', f'Enregistrements détectés dans le manifeste (défaut + alternatives) : {summary["manifest_audio_count"]}.',
              'Le pilote est un fichier de suivi ; il ne limite pas les audios exportés.', '', '## Exclusions explicites', '']
    lines += [f'- ID {row["word_id"]} : {", ".join(row["reasons"])}.' for row in data['excluded']] or ['Aucune.']
    for field, title in [('categorie', 'catégorie'), ('niveau', 'niveau')]:
        lines += ['', f'## Répartition par {title}', '', '| Groupe | Entrées | Avec audio | À revoir |', '| --- | ---: | ---: | ---: |']
        for group in sorted({row[field] for row in data['lexicon']}):
            members = [row for row in data['lexicon'] if row[field] == group]
            lines.append(f'| {group.replace(chr(124), chr(92) + chr(124))} | {len(members)} | {sum(r["has_audio"] for r in members)} | {sum(r["needs_review"] for r in members)} |')
    lines += ['', '## Locuteurs techniques', '', '| ID technique | Audios | Durée totale (s) |', '| --- | ---: | ---: |']
    for speaker in sorted({r['speaker_id'] for r in data['speech']}):
        members = [r for r in data['speech'] if r['speaker_id'] == speaker]
        lines.append(f'| {speaker} | {len(members)} | {sum(r["duration_seconds"] for r in members):.3f} |')
    lines += ['', 'Aucune identité, région, information démographique ou autorisation de diffusion n’est déduite de ces IDs.',
              '', '## Présence audio', '', f'- Avec audio : {summary["words_with_audio"]}.',
              f'- Sans audio : {summary["lexical_entries"] - summary["words_with_audio"]}.', '', '## Points à revoir', '',
              'Les statuts sont des signaux de revue, pas des corrections ou des erreurs confirmées. Les lignes sont conservées.', '']
    counts = Counter(reason for row in data['review'] for reason in row['review_reasons'])
    lines += [f'- {reason} : {count} entrée(s).' for reason, count in sorted(counts.items())]
    lines += ['', '### Groupes signalés par le contrôle existant', '']
    for kind, _, ids, detail in data['findings']:
        lines.append(f'- {kind} ; IDs {", ".join(ids)} : {detail}')
    lines += ['', 'Les variantes indiquées par « / » restent dans leur champ original ; aucune forme n’est découpée ni réécrite dans les datasets.',
              'Les validations inconnues restent null en JSONL et vides en CSV. Une valeur true exige une preuve déclarée et un relecteur.',
              '', '## Splits techniques', '', f'Seed fixe : {summary["split_seed"]}. Groupes par paire FR/Dendi normalisée pour comparaison seulement, allocation 80/10/10 par groupes.', '']
    lines += [f'- {name} : {count} lignes.' for name, count in summary['splits'].items()]
    lines += ['', 'Ces splits servent uniquement à tester le pipeline. Le volume lexical ne permet pas une évaluation sérieuse de traduction de phrases.',
              'Aucun split Speech de performance n’est créé. Quelques dizaines de WAV d’un locuteur ne mesurent pas la généralisation ASR.',
              'Le baseline lexical consulte le lexique complet : ses recherches ne sont pas des scores de généralisation.', '', '## Provenance et reproductibilité', '',
              'Les empreintes des sources, du pipeline et de chaque WAV sont dans source-provenance.json. Les artefacts ne contiennent pas de date volatile.',
              f'WAV déclarés rattachés à une entrée exclue : {sum(r["excluded_from_speech"] for r in data["provenance"]["audio_files"])}.',
              f'WAV hors manifeste, non inclus : {len(data["provenance"]["unreferenced_wav_files"])}.', '']
    return '\n'.join(lines).encode('utf-8')


def artifacts(data):
    output = {}
    for directory, name, rows, fields in [('lexicon', 'dendi_lexicon', data['lexicon'], LEX_FIELDS), ('speech', 'speech_lexicon', data['speech'], SPEECH_FIELDS)]:
        output[f'{directory}/{name}.csv'] = csv_bytes(rows, fields)
        output[f'{directory}/{name}.jsonl'] = jsonl_bytes(rows, fields)
    for name, rows in data['splits'].items():
        output[f'splits/lexicon_{name}.csv'] = csv_bytes(rows, LEX_FIELDS)
    output['reports/excluded-entries.csv'] = csv_bytes(data['excluded'], ['word_id', 'fr', 'dendi', 'reasons'])
    output['reports/review-entries.jsonl'] = jsonl_bytes(data['review'])
    output['reports/corpus-summary.json'] = json_bytes(data['summary'])
    output['reports/corpus-summary.md'] = summary_markdown(data)
    output['reports/source-provenance.json'] = json_bytes(data['provenance'])
    return output


def safe_output(root, output):
    root, output = Path(root).resolve(), Path(output).resolve()
    protected = ['app', 'lib', 'public', 'docs', 'scripts', 'experiments', 'tests', '.git', 'node_modules', '.next']
    if root.is_relative_to(output) or any(output.is_relative_to(root / name) for name in protected):
        raise ValueError('Le corpus dérivé ne peut pas remplacer les sources ou la production.')
    return output


def write_corpus(root, output, data):
    output = safe_output(root, output)
    for name, content in artifacts(data).items():
        path = output / name
        if not path.resolve().is_relative_to(output):
            raise ValueError(f'Chemin de sortie non autorisé : {name}')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    template = output / 'parallel/fr_dendi_sentences.csv'
    if not template.resolve().is_relative_to(output):
        raise ValueError('Chemin du template non autorisé.')
    if not template.exists():
        template.parent.mkdir(parents=True, exist_ok=True)
        template.write_bytes(csv_bytes([], PARALLEL_FIELDS))


def read_csv(path):
    with Path(path).open(encoding='utf-8', newline='') as source:
        reader = csv.DictReader(source)
        rows = list(reader)
        if any(None in row or any(value is None for value in row.values()) for row in rows):
            raise ValueError(f'CSV invalide : {path.name}')
        return reader.fieldnames, rows


def validate(root, output, seed=SEED):
    output = safe_output(root, output)
    data = derive(root, seed)
    errors = []
    for name, expected in artifacts(data).items():
        path = output / name
        if not path.is_file() or path.is_symlink():
            errors.append(f'Artefact absent ou lien : {name}')
            continue
        raw = path.read_bytes()
        raw.decode('utf-8')  # strict; no replacement of malformed Dendi characters
        if raw != expected:
            errors.append(f'Artefact modifié ou périmé (valeurs, Unicode, métadonnées ou provenance) : {name}')
    lex_path = output / 'lexicon/dendi_lexicon.jsonl'
    speech_path = output / 'speech/speech_lexicon.jsonl'
    if not lex_path.exists() or not speech_path.exists():
        return errors
    lexicon = [json.loads(line) for line in lex_path.read_text(encoding='utf-8').splitlines()]
    speech = [json.loads(line) for line in speech_path.read_text(encoding='utf-8').splitlines()]
    for rows, key in [(lexicon, 'word_id'), (speech, 'utterance_id')]:
        values = [row[key] for row in rows]
        if len(values) != len(set(values)):
            errors.append(f'Identifiants non uniques : {key}')
        for row in rows:
            if any(not row[field].strip() or row[field] == 'N/A' for field in ['fr', 'dendi']):
                errors.append(f'Champ essentiel invalide : {row[key]}')
            if any(value == 'N/A' for value in row.values() if isinstance(value, str)):
                errors.append(f'Placeholder N/A dans le corpus : {row[key]}')
            if row['phonetique'] is None and row['phonetic_status'] == 'present':
                errors.append(f'Phonétique absente non signalée : {row[key]}')
    lex_ids = {row['word_id'] for row in lexicon}
    audio_counts = Counter(row['word_id'] for row in speech)
    for row in speech:
        path = (Path(root) / row['audio_path']).resolve()
        if not path.is_relative_to((Path(root) / 'public/audio/dendi').resolve()) or not path.is_file() or path.stat().st_size == 0 or row['word_id'] not in lex_ids:
            errors.append(f'Association audio invalide : {row["utterance_id"]}')
    for row in lexicon:
        if row['audio_count'] != audio_counts[row['word_id']] or row['has_audio'] != bool(audio_counts[row['word_id']]):
            errors.append(f'Comptage audio incohérent : {row["word_id"]}')
    groups, split_ids = {}, []
    for name in ['train', 'validation', 'test']:
        _, rows = read_csv(output / f'splits/lexicon_{name}.csv')
        split_ids.extend(int(row['word_id']) for row in rows)
        for row in rows:
            key = pair_key(row)
            if key in groups and groups[key] != name:
                errors.append('Doublon lexical présent dans plusieurs splits.')
            groups[key] = name
    if len(split_ids) != len(set(split_ids)) or set(split_ids) != lex_ids:
        errors.append('Les splits ne partitionnent pas exactement le lexique.')
    fields, sentences = read_csv(output / 'parallel/fr_dendi_sentences.csv')
    if fields != PARALLEL_FIELDS:
        errors.append('Colonnes du corpus parallèle incorrectes.')
    sentence_ids = [row['sentence_id'] for row in sentences]
    if len(sentence_ids) != len(set(sentence_ids)):
        errors.append('IDs de phrases dupliqués.')
    return errors
