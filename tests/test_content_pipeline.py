"""Isolated fixtures only, never real Dendi recordings or files under public/."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / f'{name}.py')
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


audit = module('audit-dendi-content')
assets = module('check-pronunciation-assets')


class ContentPipelineTests(unittest.TestCase):
    def test_audit_does_not_mutate_and_finds_all_signals(self):
        row = dict(word_id='1', fr='test A', dendi=' form ', phonetique='same', categorie='test', niveau='test')
        rows = [row, {**row, 'word_id': '2', 'fr': 'test B'},
                {**row}, {**row, 'word_id': '3', 'phonetique': '', 'dendi': 'x\u200by'}]
        before = json.dumps(rows)
        findings = audit.anomalies(rows)
        self.assertEqual(before, json.dumps(rows))
        kinds = {item[0] for item in findings}
        self.assertTrue({'IDs dupliqués', 'Phonétiques partagées',
                         'Formes Dendi avec traductions différentes', 'Doublons lexicaux exacts (hors ID)',
                         'Champs vides', 'Caractères ou espaces à vérifier'}.issubset(kinds))

    def test_inventory_and_pilot_integrity(self):
        rows = audit.read_inventory(ROOT / 'docs/data/dendi-content-audit.csv')
        pilot = assets.load_csv(ROOT / 'docs/data/pronunciation-pilot.csv', ['word_id', 'expected_filename'])
        self.assertEqual(len(rows), 182)
        self.assertEqual(len({r['word_id'] for r in rows}), 182)
        self.assertTrue(20 <= len(pilot) <= 30)
        by_id = {r['word_id']: r for r in rows}
        for row in pilot:
            for field in ['fr', 'dendi', 'phonetique']:
                self.assertEqual(row[field], by_id[row['word_id']][field])
            self.assertEqual(row['recorded'], '')
            self.assertEqual(row['linguistic_validated'], '')

    def test_assets_detect_errors_and_require_explicit_validation(self):
        inventory = [dict(word_id='1', niveau='test', categorie='test', linguistic_validated='', validated_by='')]
        pilot = [dict(word_id='1', expected_filename='1.mp3')]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            _, errors, pending = assets.check(inventory, pilot, {}, root)
            self.assertEqual(errors, [])
            self.assertEqual(pending, ['1'])
            # Text bytes are deliberately NOT an audio recording; test path/size checks only.
            (root / '1.mp3').write_bytes(b'DEV ONLY structural fixture')
            _, errors, _ = assets.check(inventory, pilot, {}, root)
            self.assertTrue(any('orphelin' in item for item in errors))
            manifest = {'1': {'path': '/audio/dendi/1.mp3'}}
            _, errors, pending = assets.check(inventory, pilot, manifest, root)
            self.assertTrue(any('Validation' in item for item in errors))
            manifest['1']['validated'] = True
            inventory[0].update(linguistic_validated='true', validated_by='TEST ONLY reviewer')
            report, errors, pending = assets.check(inventory, pilot, manifest, root)
            self.assertEqual(errors, [])
            self.assertEqual(pending, [])
            self.assertIn('100.00 %', report)
            (root / '1.wav').write_bytes(b'DEV ONLY duplicate')
            (root / '2.mp3').write_bytes(b'')
            (root / '1.ogg').write_bytes(b'DEV ONLY wrong extension')
            (root / '01.mp3').write_bytes(b'DEV ONLY wrong ID')
            _, errors, pending = assets.check(inventory, pilot, manifest, root)
            for fragment in ['Plusieurs fichiers', 'ID audio inconnu', 'Fichier vide', 'non autorisé']:
                self.assertTrue(any(fragment in item for item in errors), errors)
            self.assertEqual(pending, ['1'])

    def test_missing_manifest_file_and_unknown_manifest_id(self):
        rows = [dict(word_id='1', niveau='test', categorie='test')]
        with tempfile.TemporaryDirectory() as directory:
            _, errors, _ = assets.check(rows, [], {'1': {'path': '/audio/dendi/1.mp3'},
                                                  '99': {'path': '/audio/dendi/99.mp3'}}, Path(directory))
            self.assertTrue(any('absent' in error for error in errors))
            self.assertTrue(any('inconnu' in error for error in errors))

    def test_duplicate_json_keys_are_not_silently_lost(self):
        with self.assertRaises(ValueError):
            json.loads('{"1": {}, "1": {}}', object_pairs_hook=assets.unique_object)


if __name__ == '__main__':
    unittest.main()
