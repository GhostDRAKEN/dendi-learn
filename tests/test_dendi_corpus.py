"""Corpus tests use private temporary fixtures, never production data mutations."""
import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import unicodedata
import wave

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


corpus = load('corpus_pipeline_tests', ROOT / 'scripts/dendi_corpus.py')
baseline = load('lexical_baseline_tests', ROOT / 'experiments/lexical_translation_baseline.py')


def make_wav(path, value=1):
    path.parent.mkdir(parents=True, exist_ok=True)
    # DEV ONLY non-speech bytes. They never enter public/ of the actual project.
    with wave.open(str(path), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(value.to_bytes(2, 'little') * 80)


def write_inventory(root, rows):
    path = root / corpus.INPUTS[0]
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = ['word_id', 'fr', 'dendi', 'phonetique', 'categorie', 'niveau', 'variant_region', 'source', 'linguistic_validated', 'validated_by']
    path.write_bytes(corpus.csv_bytes(rows, fields))


def fixture(root):
    raw = 'TEST ɔ ɛ nɔ̀ e\u0301 '
    a = dict(word_id='1', fr='TEST FR A', dendi=raw, phonetique='TEST', categorie='test', niveau='test')
    rows = [a, {**a, 'word_id': '2', 'fr': 'N/A'},
            {**a, 'word_id': '3', 'fr': 'TEST FR C', 'phonetique': ''},
            {**a, 'word_id': '4'}, {**a, 'word_id': '5', 'fr': ' N/A ', 'phonetique': 'N/A'},
            {**a, 'word_id': '6', 'dendi': '   '}]
    write_inventory(root, rows)
    pilot = root / corpus.INPUTS[1]
    pilot.write_bytes(corpus.csv_bytes([dict(word_id='1', expected_filename='ddn_001_spk001.wav')], ['word_id', 'expected_filename']))
    entries = [dict(path=f'/audio/dendi/ddn_001_{speaker}.wav', speakerId=speaker, format='wav') for speaker in ['spk001', 'spk002']]
    manifest = root / corpus.INPUTS[2]
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_bytes(corpus.json_bytes({'1': {**entries[0], 'alternatives': [entries[1]]}}))
    make_wav(root / 'public/audio/dendi/ddn_001_spk001.wav')
    make_wav(root / 'public/audio/dendi/ddn_001_spk002.wav', 2)
    return rows


class DendiCorpusTests(unittest.TestCase):
    def test_excludes_only_exact_na_and_empty_essentials(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture(root)
            data = corpus.derive(root)
            self.assertEqual({r['word_id'] for r in data['lexicon']}, {1, 3, 4, 5})
            self.assertEqual({r['word_id'] for r in data['excluded']}, {2, 6})
            self.assertEqual(data['summary']['excluded_na'], 1)
            self.assertEqual(data['summary']['excluded_empty'], 1)
            missing = {r['word_id']: r for r in data['lexicon']}
            self.assertIsNone(missing[3]['phonetique'])
            self.assertEqual(missing[3]['phonetic_status'], 'missing')
            self.assertIsNone(missing[5]['phonetique'])
            self.assertEqual(missing[5]['phonetic_status'], 'placeholder_na')
            self.assertEqual(missing[5]['fr'], ' N/A ')

    def test_unicode_preserved_and_reviews_not_removed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rows = fixture(root)
            data = corpus.derive(root)
            item = data['lexicon'][0]
            self.assertEqual(item['dendi'].encode('utf-8'), rows[0]['dendi'].encode('utf-8'))
            self.assertIn('duplicate_lexical_pair', item['review_reasons'])
            self.assertTrue(item['needs_review'])
            self.assertIn('dendi_multiple_translations', item['review_reasons'])
            self.assertIsNone(item['source'])
            self.assertIsNone(item['variant_region'])
            self.assertIsNone(item['linguistic_validated'])
            self.assertIn('ɔ'.encode(), corpus.artifacts(data)['lexicon/dendi_lexicon.jsonl'])

    def test_audio_count_speakers_and_wav_metadata_are_dynamic(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture(root)
            data = corpus.derive(root)
            self.assertEqual(data['lexicon'][0]['audio_count'], 2)
            self.assertEqual(data['summary']['audio_count'], 2)
            self.assertEqual(data['summary']['speaker_count'], 2)
            audio = data['speech'][0]
            self.assertEqual(audio['utterance_id'], 'ddn_001_spk001')
            self.assertEqual(audio['word_id'], 1)
            self.assertEqual(audio['sample_rate'], 8000)
            self.assertEqual(audio['channels'], 1)
            self.assertEqual(audio['duration_seconds'], .01)
            self.assertEqual(audio['file_size_bytes'], 204)
            self.assertTrue((root / audio['audio_path']).is_file())
            manifest_path = root / corpus.INPUTS[2]
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
            manifest['3'] = dict(path='/audio/dendi/ddn_003_spk003.wav', speakerId='spk003', format='wav')
            manifest_path.write_bytes(corpus.json_bytes(manifest))
            make_wav(root / 'public/audio/dendi/ddn_003_spk003.wav', 3)
            expanded = corpus.derive(root)
            self.assertEqual(expanded['summary']['audio_count'], 3)
            self.assertEqual(expanded['summary']['speaker_count'], 3)
            self.assertEqual(expanded['summary']['words_with_audio'], 2)

    def test_missing_zero_byte_truncated_and_unknown_audio_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture(root)
            audio = root / 'public/audio/dendi/ddn_001_spk001.wav'
            original = audio.read_bytes()
            audio.unlink()
            with self.assertRaisesRegex(ValueError, 'absent'):
                corpus.derive(root)
            audio.write_bytes(b'')
            with self.assertRaisesRegex(ValueError, 'vide'):
                corpus.derive(root)
            audio.write_bytes(original[:-2])
            with self.assertRaisesRegex(ValueError, 'tronqué'):
                corpus.derive(root)
            audio.write_bytes(original)
            path = root / corpus.INPUTS[2]
            path.write_bytes(corpus.json_bytes({'999': dict(path='/audio/dendi/ddn_999_spk001.wav', speakerId='spk001', format='wav')}))
            with self.assertRaisesRegex(ValueError, 'inconnu'):
                corpus.derive(root)

    def test_excluded_word_audio_is_validated_and_exclusion_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rows = fixture(root)
            rows[0]['dendi'] = 'N/A'
            write_inventory(root, rows)
            data = corpus.derive(root)
            self.assertEqual(data['summary']['manifest_audio_count'], 2)
            self.assertEqual(data['summary']['audio_count'], 0)
            self.assertTrue(all(r['excluded_from_speech'] for r in data['provenance']['audio_files']))
            (root / 'public/audio/dendi/ddn_001_spk001.wav').unlink()
            with self.assertRaisesRegex(ValueError, 'absent'):
                corpus.derive(root)

    def test_rebuild_preserves_sources_and_parallel_human_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture(root)
            sources = [root / name for name in corpus.INPUTS] + list((root / 'public/audio/dendi').glob('*.wav'))
            before = {path: path.read_bytes() for path in sources}
            data = corpus.derive(root)
            output = root / 'corpus'
            corpus.write_corpus(root, output, data)
            parallel = output / 'parallel/fr_dendi_sentences.csv'
            human = corpus.csv_bytes([dict(sentence_id='TEST_ONLY', fr='TEST FR', dendi='TEST DATA')], corpus.PARALLEL_FIELDS)
            parallel.write_bytes(human)
            corpus.write_corpus(root, output, corpus.derive(root))
            self.assertEqual(parallel.read_bytes(), human)
            self.assertEqual(corpus.validate(root, output), [])
            self.assertEqual(before, {path: path.read_bytes() for path in sources})
            self.assertFalse(list(output.glob('splits/speech*')))
            with self.assertRaises(ValueError):
                corpus.write_corpus(root, root / 'public', data)

    def test_source_line_endings_do_not_change_corpus_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture(root)
            before = corpus.artifacts(corpus.derive(root))
            for name in corpus.INPUTS:
                path = root / name
                path.write_bytes(path.read_bytes().replace(b'\n', b'\r\n'))
            self.assertEqual(corpus.artifacts(corpus.derive(root)), before)
            self.assertEqual(corpus.derive(root)['provenance']['text_hash_line_endings'], 'LF')

    def test_deterministic_splits_keep_duplicate_pairs_together(self):
        rows = [dict(word_id=i, fr=f'TEST {i}', dendi=f'TEST D {i}') for i in range(1, 41)]
        rows.append(dict(word_id=41, fr='TEST 1', dendi='TEST D 1'))
        first = corpus.lexical_splits(rows, 42)
        self.assertEqual(first, corpus.lexical_splits(list(reversed(rows)), 42))
        self.assertNotEqual(first, corpus.lexical_splits(rows, 43))
        partitions = {r['word_id']: name for name, members in first.items() for r in members}
        self.assertEqual(partitions[1], partitions[41])
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture(root)
            self.assertEqual(corpus.artifacts(corpus.derive(root)), corpus.artifacts(corpus.derive(root)))

    def test_validator_rejects_tampering_invalid_utf8_and_split_leakage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fixture(root)
            data = corpus.derive(root)
            output = root / 'corpus'
            corpus.write_corpus(root, output, data)
            lex_path = output / 'lexicon/dendi_lexicon.jsonl'
            lex_path.write_bytes(lex_path.read_bytes().replace('ɔ'.encode(), b'X', 1))
            self.assertTrue(corpus.validate(root, output))
            corpus.write_corpus(root, output, data)
            lex_path.write_bytes(b'\xff')
            with self.assertRaises(UnicodeDecodeError):
                corpus.validate(root, output)
            corpus.write_corpus(root, output, data)
            for name in ['train', 'test']:
                (output / f'splits/lexicon_{name}.csv').write_bytes(corpus.csv_bytes([data['lexicon'][0]], corpus.LEX_FIELDS))
            self.assertTrue(any('plusieurs splits' in error for error in corpus.validate(root, output)))

    def test_validation_true_requires_existing_evidence(self):
        row = dict(linguistic_validated='true', validated_by='')
        self.assertIsNone(corpus.documented_word_validation(row))
        row['validated_by'] = 'TEST ONLY reviewer'
        self.assertIs(corpus.documented_word_validation(row), True)
        row['linguistic_validated'] = 'false'
        self.assertIs(corpus.documented_word_validation(row), False)

    def test_current_corpus_uses_manifest_not_a_fixed_audio_count(self):
        data = corpus.derive(ROOT)
        manifest = json.loads((ROOT / corpus.INPUTS[2]).read_text(encoding='utf-8'))
        expected = sum(1 + len(entry.get('alternatives', [])) for entry in manifest.values())
        excluded = {row['word_id'] for row in data['excluded']}
        usable = sum(1 + len(entry.get('alternatives', [])) for word_id, entry in manifest.items() if int(word_id) not in excluded)
        self.assertEqual(data['summary']['manifest_audio_count'], expected)
        self.assertEqual(data['summary']['audio_count'], usable)
        self.assertEqual(corpus.validate(ROOT, ROOT / 'corpus'), [])


class LexicalBaselineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.lookup = baseline.LexicalBaseline.from_jsonl()

    def test_exact_casefold_articles_and_original_forms(self):
        self.assertEqual(self.lookup.lookup('Lundi')['translations'], ['Litɛni'])
        self.assertEqual(self.lookup.lookup('LUNDI')['translations'], ['Litɛni'])
        self.assertEqual(self.lookup.lookup('nez')['translations'], ['Nuunin'])
        self.assertEqual(self.lookup.lookup('Nuunin', 'ddn-fr')['translations'], ['Le nez'])

    def test_multiple_existing_senses_and_dendi_ambiguity(self):
        result = self.lookup.lookup('Bonjour')
        self.assertEqual({row['word_id'] for row in result['matches']}, {1, 2})
        self.assertEqual(result['match_type'], 'alias')
        rows = self.lookup.rows
        ambiguous = next(row['dendi'] for row in rows if row['word_id'] == 15)
        result = self.lookup.lookup(ambiguous, 'ddn-fr')
        self.assertTrue({15, 16}.issubset({row['word_id'] for row in result['matches']}))
        self.assertTrue(all(row['needs_review'] for row in result['matches']))

    def test_unicode_query_normalization_does_not_rewrite_results(self):
        row = next(row for row in self.lookup.rows if row['word_id'] == 3)
        result = self.lookup.lookup(unicodedata.normalize('NFD', row['dendi']), 'ddn-fr')
        self.assertIn(row['dendi'], [match['dendi'] for match in result['matches']])

    def test_fuzzy_is_marked_limited_and_never_invents(self):
        result = self.lookup.lookup('Bonjor')
        self.assertEqual(result['match_type'], 'fuzzy')
        self.assertTrue(result['is_fuzzy_suggestion'])
        self.assertEqual(result['translations'], self.lookup.lookup('Bonjour')['translations'])
        self.assertEqual(self.lookup.lookup('Ludni')['translations'], ['Litɛni'])
        self.assertEqual(self.lookup.lookup('Bonjor', fuzzy=False)['translations'], [])
        for query in ['Bonjour tout le monde', 'qzxwwv', '', 'zz']:
            self.assertEqual(self.lookup.lookup(query)['translations'], [])
        originals = {row['dendi'] for row in self.lookup.rows}
        self.assertTrue(set(result['translations']).issubset(originals))


if __name__ == '__main__':
    unittest.main()
