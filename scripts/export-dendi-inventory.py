"""Export public lexical data using GET only; never overwrite an annotated inventory."""
import argparse
import csv
import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ['word_id', 'fr', 'dendi', 'phonetique', 'categorie', 'niveau',
          'variant_region', 'source', 'linguistic_validated', 'validated_by',
          'audio_status', 'audio_speaker', 'audio_file', 'notes']


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/data/dendi-content-audit.csv')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Destination existante : choisir un nouveau --output pour préserver les annotations.')
    config = dict(os.environ)
    env_file = ROOT / '.env.local'
    if env_file.exists():
        for line in env_file.read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                config.setdefault(key.strip(), value.strip().strip('\"\''))
    url = config.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
    key = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    if not url.startswith('https://') or not key:
        parser.error('Configurer NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    rows = []
    offset = 0
    while True:
        request = Request(
            f'{url}/rest/v1/mots?select=id,fr,dendi,phonetique,categorie,niveau&order=id&limit=100&offset={offset}',
            headers={'apikey': key, 'Authorization': f'Bearer {key}'}, method='GET')
        with urlopen(request, timeout=30) as response:
            batch = json.load(response)
        if not isinstance(batch, list):
            raise ValueError('Réponse inattendue ; aucun inventaire écrit.')
        rows.extend(batch)
        if not batch:
            break
        offset += len(batch)
    if not rows:
        raise ValueError('Corpus vide ; aucun inventaire écrit.')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8-sig', newline='') as target:
        writer = csv.DictWriter(target, fieldnames=FIELDS)
        writer.writeheader()
        for row in rows:
            item = {field: row.get(field, '') for field in FIELDS[:6]}
            item['word_id'] = row['id']
            writer.writerow(item)
    print(f'{len(rows)} mots exportés ; textes sans normalisation. Métadonnées inconnues laissées vides.')


if __name__ == '__main__':
    main()
