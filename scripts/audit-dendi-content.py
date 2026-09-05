"""Read-only content checks: stdout by default; --report writes only a derived report."""
import argparse
import csv
from collections import defaultdict
from datetime import date
from pathlib import Path
import re
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
CORE = ['word_id', 'fr', 'dendi', 'phonetique', 'categorie', 'niveau']


def read_inventory(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as source:
        reader = csv.DictReader(source)
        if not set(CORE).issubset(reader.fieldnames or []):
            raise ValueError('Colonnes lexicales requises manquantes.')
        rows = list(reader)
    if any(None in row or any(row.get(field) is None for field in CORE) for row in rows):
        raise ValueError('CSV mal formé : ligne trop courte ou trop longue.')
    return rows


def anomalies(rows):
    findings = []
    def add(kind, members, detail):
        findings.append((kind, [index + 2 for index, _ in members],
                         [row['word_id'] for _, row in members], detail))
    for field, kind in [('word_id', 'IDs dupliqués'), ('phonetique', 'Phonétiques partagées'),
                        ('dendi', 'Formes Dendi avec traductions différentes')]:
        groups = defaultdict(list)
        for index, row in enumerate(rows):
            if row[field].strip():
                groups[row[field]].append((index, row))
        for value, members in groups.items():
            if len(members) < 2:
                continue
            if field == 'dendi' and len({row['fr'] for _, row in members}) < 2:
                continue
            add(kind, members, repr(value))
    groups = defaultdict(list)
    for index, row in enumerate(rows):
        groups[tuple(row[field] for field in CORE[1:])].append((index, row))
    for members in groups.values():
        if len(members) > 1:
            add('Doublons lexicaux exacts (hors ID)', members, 'Les cinq champs lexicaux sont identiques.')
    for index, row in enumerate(rows):
        if not re.fullmatch(r'[1-9][0-9]*', row['word_id']):
            add('ID non conforme', [(index, row)], repr(row['word_id']))
        for field in CORE:
            value = row[field]
            if not value.strip():
                add('Champs vides', [(index, row)], field)
                continue
            flags = []
            if value != value.strip():
                flags.append('espaces en début/fin')
            if re.search(r'\s{2,}', value):
                flags.append('espacements répétés')
            suspicious = sorted({f'U+{ord(c):04X}' for c in value
                                 if unicodedata.category(c) in {'Cc', 'Cf', 'Cs'}
                                 or c == '\ufffd' or (c.isspace() and c != ' ')})
            if suspicious:
                flags.append('caractères invisibles/non ordinaires : ' + ', '.join(suspicious))
            if unicodedata.normalize('NFC', value) != value:
                flags.append('Unicode non NFC (peut être valide)')
            if value.strip().upper() in {'N/A', 'NULL', 'TODO', '?'}:
                flags.append('valeur de remplacement possible')
            if flags:
                add('Caractères ou espaces à vérifier', [(index, row)], f'{field} : {" ; ".join(flags)} ; {value!r}')
    return findings


def render(rows, findings):
    def cell(value):
        return str(value).replace('|', '\\|').replace('\n', '\\n').replace('\r', '\\r')
    sections = ['# Audit du contenu Dendi', '', f'Date de génération : {date.today().isoformat()}.',
                f'Inventaire : {len(rows)} lignes, {len({r["word_id"] for r in rows})} IDs distincts.', '',
                'Source technique : export GET de la table mots de Supabase. La provenance linguistique reste inconnue.',
                'À VÉRIFIER : ces signaux ne constituent ni des erreurs confirmées ni une validation linguistique.',
                'Aucune entrée corrigée. Comparaisons exactes, sensibles à la casse ; doublons lexicaux comparés hors ID.',
                'Les lettres Dendi, accents et apostrophes ne sont pas considérés suspects en eux-mêmes.',
                'Les colonnes éditoriales vides ne sont pas des anomalies : leur contenu est inconnu.', '']
    kinds = ['IDs dupliqués', 'ID non conforme', 'Phonétiques partagées',
             'Formes Dendi avec traductions différentes', 'Doublons lexicaux exacts (hors ID)',
             'Champs vides', 'Caractères ou espaces à vérifier']
    for kind in kinds:
        selected = [item for item in findings if item[0] == kind]
        sections += [f'## {kind}', '', f'{len(selected)} signalement(s).', '']
        for _, lines, ids, detail in selected:
            sections.append(f'- IDs {", ".join(ids)} ; lignes CSV {", ".join(map(str, lines))} : {cell(detail)}')
        sections.append('')
    known = [r for r in rows if r['phonetique'].strip() == 'Fo nna wiciri !']
    sections += ['## Cas Fo nna wiciri !', '', '| ID | Français | Dendi | Phonétique | Catégorie | Niveau |',
                 '| --- | --- | --- | --- | --- | --- |']
    sections += ['| ' + ' | '.join(cell(r[f]) for f in CORE) + ' |' for r in known]
    sections += ['', 'Faire vérifier séparément chaque sens et sa forme par des relecteurs natifs. Ne pas fusionner ni corriger automatiquement.', '']
    return '\n'.join(sections)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, default=ROOT / 'docs/data/dendi-content-audit.csv')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    rows = read_inventory(args.inventory)
    report = render(rows, anomalies(rows))
    if args.report:
        if args.report.resolve() == args.inventory.resolve():
            parser.error('Le rapport ne peut pas remplacer l’inventaire.')
        args.report.write_text(report, encoding='utf-8')
    print(report)


if __name__ == '__main__':
    main()
