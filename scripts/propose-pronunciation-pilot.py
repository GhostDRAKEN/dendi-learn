"""Propose up to 30 beginner words without editing the curriculum or existing CSVs."""
import argparse
import csv
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('content_audit', Path(__file__).with_name('audit-dendi-content.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, default=ROOT / 'docs/data/dendi-content-audit.csv')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/data/pronunciation-pilot.csv')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Le pilote existe déjà ; choisir un nouveau --output pour préserver les annotations.')
    rows = audit.read_inventory(args.inventory)
    flagged = {word_id for _, _, ids, _ in audit.anomalies(rows) for word_id in ids}
    order = ['Salutations', 'temps__journee', 'temps__repere', 'couleurs']
    selected = sorted((row for row in rows if row['niveau'] == 'debutant'
                       and row['categorie'] in order and row['word_id'] not in flagged),
                      key=lambda row: (order.index(row['categorie']), int(row['word_id'])))[:30]
    if not 20 <= len(selected) <= 30:
        parser.error(f'{len(selected)} candidats seulement : proposer le lot avec un relecteur humain.')
    fields = ['word_id', 'fr', 'dendi', 'phonetique', 'expected_filename', 'recorded', 'linguistic_validated', 'notes']
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8-sig', newline='') as target:
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        for row in selected:
            writer.writerow({**{key: row[key] for key in fields[:4]},
                             'expected_filename': f'{row["word_id"]}.mp3',
                             'notes': 'Lot proposé ; validation linguistique requise avant enregistrement final.'})
    print(f'{len(selected)} candidats ; absence de signal automatique ≠ validation linguistique.')


if __name__ == '__main__':
    main()
