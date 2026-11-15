"""Build local corpus derivatives. Does not write Supabase, manifest or WAVs."""
import argparse
from pathlib import Path
import sys
from dendi_corpus import ROOT, SEED, derive, write_corpus


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--seed', type=int, default=SEED)
    args = parser.parse_args()
    try:
        data = derive(args.root, args.seed)
        write_corpus(args.root, args.output or args.root / 'corpus', data)
        summary = data['summary']
        print(f'Corpus reconstruit : {summary["source_entries"]} sources, {summary["lexical_entries"]} entrées lexicales, {summary["audio_count"]} audios réels, {summary["speaker_count"]} locuteur(s) technique(s).')
        return 0
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'Construction refusée : {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
