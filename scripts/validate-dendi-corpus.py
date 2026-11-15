"""Validate corpus artifacts against local sources without modifying either."""
import argparse
from pathlib import Path
import sys
from dendi_corpus import ROOT, SEED, validate


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--seed', type=int, default=SEED)
    args = parser.parse_args()
    try:
        errors = validate(args.root, args.output or args.root / 'corpus', args.seed)
        for error in errors:
            print('- ' + error)
        print('Corpus valide : sources, Unicode, fichiers audio, métadonnées, revues et splits vérifiés.' if not errors else f'{len(errors)} incohérence(s).')
        return int(bool(errors))
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'Validation impossible : {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
