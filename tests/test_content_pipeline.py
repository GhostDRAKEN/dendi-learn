"""Isolated structural tests. Fixtures are never placed under public/."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import wave

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / f'{name}.py')
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


audit = module('audit-dendi-content')
assets = module('check-pronunciation-assets')
generator = module('generate-pronunciation-manifest')


def fixture_wav(path, value=1):
    # DEV ONLY PCM bytes, not speech; private test directory, no UI association.
    with wave.open(str(path), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(value.to_bytes(2, 'little') * 80)


def recording(word_id='1', speaker_id='spk001', **metadata):
    return dict(path=f'/audio/dendi/ddn_{int(word_id):03d}_{speaker_id}.wav', speakerId=speaker_id, format='wav', **metadata)


class ContentPipelineTests(unittest.TestCase):
    def test_audit_does_not_mutate_and_finds_all_signals(self):
        row = dict(word_id='1', fr='test A', dendi=' form ', phonetique='same', categorie='test', niveau='test')
        rows = [row, {**row, 'word_id': '2', 'fr': 'test B'},
                {**row}, {**row, 'word_id': '3', 'phonetique': '', 'dendi': 'x\u200by'}]
        before = json.dumps(rows)
        findings = audit.anomalies(rows)
        self.assertEqual(before, json.dumps(rows))
        self.assertTrue({'IDs dupliqués', 'Phonétiques partagées',
                         'Formes Dendi avec traductions différentes', 'Doublons lexicaux exacts (hors ID)',
                         'Champs vides', 'Caractères ou espaces à vérifier'}.issubset({f[0] for f in findings}))

    def test_inventory_and_real_pilot_integrity(self):
        rows = audit.read_inventory(ROOT / 'docs/data/dendi-content-audit.csv')
        pilot = assets.load_csv(ROOT / 'docs/data/pronunciation-pilot.csv', ['word_id', 'expected_filename'])
        self.assertEqual(len(rows), 182)
        self.assertEqual(len({r['word_id'] for r in rows}), 182)
        self.assertTrue(20 <= len(pilot) <= 30)
        by_id = {r['word_id']: r for r in rows}
        for row in pilot:
            for field in ['fr', 'dendi', 'phonetique']:
                self.assertEqual(row[field], by_id[row['word_id']][field])
            self.assertEqual(assets.parse_filename(row['expected_filename'])[0], row['word_id'])
            self.assertEqual(row['recorded'], 'true')
            self.assertEqual(row['linguistic_validated'], '')

    def test_canonical_names(self):
        self.assertEqual(assets.parse_filename('ddn_001_spk001.wav'), ('1', 'spk001'))
        self.assertEqual(assets.parse_filename('ddn_001_spk002.wav'), ('1', 'spk002'))
        self.assertEqual(assets.parse_filename('ddn_188_spk001.wav'), ('188', 'spk001'))
        self.assertEqual(assets.parse_filename('ddn_1000_spk001.wav'), ('1000', 'spk001'))
        for name in ['1.mp3', '1.wav', 'ddn_1_spk001.wav', 'ddn_0001_spk001.wav', 'ddn_000_spk001.wav',
                     'ddn_001_spk000.wav', 'ddn_001_spk1.wav', 'ddn_001_SPK001.wav', 'ddn_001_spk001.mp3']:
            self.assertIsNone(assets.parse_filename(name), name)

    def test_presence_integration_validation_are_independent(self):
        inventory = [dict(word_id='1', niveau='test', categorie='test', linguistic_validated='', validated_by='')]
        pilot = [dict(word_id='1', expected_filename='ddn_001_spk001.wav')]
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            root = Path(directory)
            _, errors, pending = assets.check(inventory, pilot, {}, root)
            self.assertEqual(errors, [])
            self.assertEqual(pending, ['1'])
            fixture_wav(root / pilot[0]['expected_filename'])
            _, errors, _ = assets.check(inventory, pilot, {}, root)
            self.assertTrue(any('orphelin' in item for item in errors))
            manifest = {'1': recording()}
            report, errors, pending = assets.check(inventory, pilot, manifest, root)
            self.assertEqual(errors, [])
            self.assertEqual(pending, [])
            self.assertIn('non documentée', report)
            manifest['1']['validated'] = True
            _, errors, _ = assets.check(inventory, pilot, manifest, root)
            self.assertTrue(any('sans documentation' in item for item in errors))
            inventory[0].update(linguistic_validated='true', validated_by='TEST ONLY reviewer')
            _, errors, _ = assets.check(inventory, pilot, manifest, root)
            self.assertEqual(errors, [])

    def test_multiple_speakers_are_declared_and_duplicates_rejected(self):
        rows = [dict(word_id='1', niveau='test', categorie='test')]
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            root = Path(directory)
            fixture_wav(root / 'ddn_001_spk001.wav')
            fixture_wav(root / 'ddn_001_spk002.wav', 2)
            manifest = {'1': recording(alternatives=[recording(speaker_id='spk002')])}
            _, errors, _ = assets.check(rows, [], manifest, root)
            self.assertEqual(errors, [])
            manifest['1']['alternatives'].append(recording(speaker_id='spk002'))
            _, errors, _ = assets.check(rows, [], manifest, root)
            self.assertTrue(any('Doublon exact mot/locuteur' in error for error in errors))
            manifest['1']['alternatives'] = []
            _, errors, _ = assets.check(rows, [], manifest, root)
            self.assertTrue(any('orphelin' in error for error in errors))
            fixture_wav(root / 'ddn_001_spk002.wav')
            _, errors, _ = assets.check(rows, [], manifest, root)
            self.assertTrue(any('Doublon exact de contenu' in error for error in errors))

    def test_bad_assets_missing_files_unknown_id_and_metadata(self):
        rows = [dict(word_id='1', niveau='test', categorie='test')]
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            root = Path(directory)
            (root / 'ddn_001_spk001.wav').write_bytes(b'')
            fixture_wav(root / 'ddn_002_spk001.wav')
            (root / 'ddn_001_spk001.ogg').write_bytes(b'DEV ONLY')
            _, errors, _ = assets.check(rows, [], {'1': recording(), '99': recording('99')}, root)
            for fragment in ['Fichier vide', 'ID audio inconnu', 'non autorisé', 'absent', 'ID manifeste inconnu']:
                self.assertTrue(any(fragment in error for error in errors), errors)
            (root / 'ddn_001_spk001.wav').write_bytes(b'not a WAV')
            _, errors, _ = assets.check(rows, [], {'1': recording()}, root)
            self.assertTrue(any('WAV illisible' in error for error in errors))
            fixture_wav(root / 'ddn_001_spk001.wav')
            _, errors, _ = assets.check(rows, [], {'1': {**recording(), 'speakerId': 'spk002'}}, root)
            self.assertTrue(any('incohérent' in error for error in errors))

    def test_generation_preserves_metadata_and_default_and_never_validates(self):
        files = {'ddn_001_spk001.wav': ('1', 'spk001'), 'ddn_001_spk002.wav': ('1', 'spk002')}
        with self.assertRaises(ValueError):
            generator.build_manifest(files, {})
        manifest = generator.build_manifest(files, {}, 'spk001')
        self.assertNotIn('validated', manifest['1'])
        self.assertNotIn('validated', manifest['1']['alternatives'][0])
        old = {'1': recording(speaker_id='spk002', source='TEST ONLY source')}
        refreshed = generator.build_manifest(files, old)
        self.assertEqual(refreshed['1']['speakerId'], 'spk002')
        self.assertEqual(refreshed['1']['source'], 'TEST ONLY source')
        self.assertNotIn('validated', refreshed['1'])

    def test_duplicate_json_keys_are_not_silently_lost(self):
        with self.assertRaises(ValueError):
            json.loads('{"1": {}, "1": {}}', object_pairs_hook=assets.unique_object)


if __name__ == '__main__':
    unittest.main()
