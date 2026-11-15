"""Local bidirectional lexical lookup, not a sentence translation model."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import re
import sys
import unicodedata

DEFAULT_LEXICON = Path(__file__).resolve().parents[1] / 'corpus/lexicon/dendi_lexicon.jsonl'


def normalize(text, french=False):
    text = unicodedata.normalize('NFC', text).replace('\u2019', "'")
    text = ' '.join(text.split())
    return text.casefold() if french else text


def aliases(text, french=False):
    """Search aliases from labels already present, without rewriting their translations."""
    pending = [normalize(text, french)]
    seen = set()
    while pending:
        value = pending.pop()
        if not value or value in seen:
            continue
        seen.add(value)
        if '/' in value:
            pending.extend(part.strip() for part in value.split('/'))
        if french:
            unqualified = re.sub(r'\s+\([^()]*\)$', '', value)
            without_article = re.sub(r"^(?:(?:le|la|les|un|une|des)\s+|l')", '', value)
            pending.extend([unqualified, without_article])
    return seen - {normalize(text, french)}


def one_edit_apart(left, right):
    """One insertion, deletion, replacement or adjacent transposition; no broad guessing."""
    if abs(len(left) - len(right)) > 1:
        return False
    if len(left) == len(right):
        positions = [i for i, pair in enumerate(zip(left, right)) if pair[0] != pair[1]]
        return len(positions) == 1 or (len(positions) == 2 and positions[1] == positions[0] + 1 and
                                      left[positions[0]] == right[positions[1]] and left[positions[1]] == right[positions[0]])
    shorter, longer = sorted([left, right], key=len)
    index = 0
    while index < len(shorter) and shorter[index] == longer[index]:
        index += 1
    return shorter[index:] == longer[index + 1:]


class LexicalBaseline:
    def __init__(self, rows):
        self.rows = rows
        self.indices, self.alias_indices = {}, {}
        if len(rows) != len({row['word_id'] for row in rows}):
            raise ValueError('IDs lexicaux dupliqués.')
        for direction, field in [('fr-ddn', 'fr'), ('ddn-fr', 'dendi')]:
            index, alias_index = defaultdict(list), defaultdict(list)
            for row in rows:
                if any(not row[key].strip() or row[key] == 'N/A' for key in ['fr', 'dendi']):
                    raise ValueError('Le baseline exige un lexique construit et validé.')
                key = normalize(row[field], french=field == 'fr')
                index[key].append(row)
                for alias in aliases(row[field], french=field == 'fr'):
                    alias_index[alias].append(row)
            self.indices[direction], self.alias_indices[direction] = index, alias_index

    @classmethod
    def from_jsonl(cls, path=DEFAULT_LEXICON):
        return cls([json.loads(line) for line in Path(path).read_text(encoding='utf-8').splitlines()])

    def lookup(self, query, direction='fr-ddn', fuzzy=True):
        if direction not in self.indices:
            raise ValueError('Direction attendue : fr-ddn ou ddn-fr.')
        key = normalize(query, french=direction == 'fr-ddn')
        field = 'fr' if direction == 'fr-ddn' else 'dendi'
        target = 'dendi' if direction == 'fr-ddn' else 'fr'
        direct, alias = self.indices[direction], self.alias_indices[direction]
        matches = []
        mode = 'none'
        if key and key in direct:
            mode = 'exact' if any(row[field] == query for row in direct[key]) else 'normalized'
            matches = [(key, row) for row in direct[key]]
        elif key and key in alias:
            mode = 'alias'
            matches = [(key, row) for row in alias[key]]
        elif fuzzy and len(key) >= 4:
            candidates = sorted(candidate for candidate in direct.keys() | alias.keys()
                                if len(candidate) >= 4 and one_edit_apart(key, candidate))
            if candidates:
                mode = 'fuzzy'
                for candidate in candidates:
                    matches.extend((candidate, row) for row in direct.get(candidate, []) + alias.get(candidate, []))
        seen, result = set(), []
        for matched_key, row in sorted(matches, key=lambda pair: (pair[1]['word_id'], pair[0])):
            if row['word_id'] in seen:
                continue
            seen.add(row['word_id'])
            result.append(dict(word_id=row['word_id'], fr=row['fr'], dendi=row['dendi'], translation=row[target],
                               matched_key=matched_key, edit_distance=1 if mode == 'fuzzy' else 0,
                               linguistic_validated=row.get('linguistic_validated'), needs_review=row.get('needs_review'),
                               review_reasons=row.get('review_reasons', [])))
        return dict(baseline='baseline lexical', direction=direction, query=query, match_type=mode,
                    translations=list(dict.fromkeys(row['translation'] for row in result)), matches=result,
                    is_fuzzy_suggestion=mode == 'fuzzy')


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('query')
    parser.add_argument('--direction', choices=['fr-ddn', 'ddn-fr'], default='fr-ddn')
    parser.add_argument('--lexicon', type=Path, default=DEFAULT_LEXICON)
    parser.add_argument('--no-fuzzy', action='store_true')
    args = parser.parse_args()
    result = LexicalBaseline.from_jsonl(args.lexicon).lookup(args.query, args.direction, not args.no_fuzzy)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
