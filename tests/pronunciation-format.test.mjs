import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parsePronunciationFilename } from '../lib/pronunciation-format.ts'

test('canonical filenames support each speaker without inferring URLs', () => {
  assert.deepEqual(parsePronunciationFilename('ddn_001_spk001.wav'), {wordId:1,speakerId:'spk001',format:'wav'})
  assert.deepEqual(parsePronunciationFilename('ddn_001_spk002.wav'), {wordId:1,speakerId:'spk002',format:'wav'})
  assert.deepEqual(parsePronunciationFilename('ddn_188_spk001.wav'), {wordId:188,speakerId:'spk001',format:'wav'})
  for (const name of ['1.mp3','1.wav','ddn_000_spk001.wav','ddn_01_spk001.wav','ddn_0001_spk001.wav','ddn_001_spk000.wav','ddn_001_spk1.wav','ddn_001_spk001.mp3','../ddn_001_spk001.wav']) {
    assert.equal(parsePronunciationFilename(name),null,name)
  }
})
