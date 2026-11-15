# Corpus Dendi v0.1

Ce dossier est un corpus **dérivé local** de Dendi-Learn. Le lexique et les
expressions existantes servent à construire un pipeline reproductible et un
baseline lexical. Ils ne suffisent pas à entraîner ou évaluer sérieusement un
traducteur de phrases, un ASR ou un TTS.

## Sources et organisation

- `docs/data/dendi-content-audit.csv` : inventaire lexical source unique.
- `lib/pronunciation-manifest.json` : liste des enregistrements réellement intégrés,
  avec l’enregistrement par défaut et toutes les `alternatives`.
- `docs/data/pronunciation-pilot.csv` : suivi du pilote, conservé dans la provenance.
  Ce fichier ne limite pas le nombre d’audios du corpus.
- `public/audio/dendi/` : WAV d’origine. Ils restent à cet emplacement, sans copie,
  modification, réencodage ou conversion.
- `scripts/audit-dendi-content.py` et `scripts/check-pronunciation-assets.py` :
  contrôles existants réutilisés pour les signaux linguistiques et les noms audio.

```text
corpus/
  README.md
  lexicon/dendi_lexicon.csv
  lexicon/dendi_lexicon.jsonl
  speech/speech_lexicon.csv
  speech/speech_lexicon.jsonl
  splits/lexicon_train.csv
  splits/lexicon_validation.csv
  splits/lexicon_test.csv
  parallel/fr_dendi_sentences.csv
  reports/corpus-summary.md
  reports/corpus-summary.json
  reports/excluded-entries.csv
  reports/review-entries.jsonl
  reports/source-provenance.json
```

La source linguistique, la variété et les validations ne sont pas déduites du
stockage dans Supabase, d’un nom de fichier ou d’un ID de locuteur. Les colonnes
inconnues restent vides en CSV et null en JSONL. Aucune information sur le nom,
le sexe, l’âge, la région, l’ethnie, le dialecte ou le consentement du locuteur
n’est fabriquée. La présence technique des fichiers ne documente pas leur licence
ou leurs autorisations d’utilisation pour de futurs entraînements.

## Règles de dérivation

Une ligne est exclue seulement si `fr` ou `dendi` est exactement `N/A`, ou vide
(y compris composée uniquement d’espaces). L’exclusion et ses raisons sont
journalisées dans `reports/excluded-entries.csv` ; la ligne source reste intacte.
Les formes telles que `n/a` ou ` N/A ` ne sont pas assimilées silencieusement à
`N/A` : elles sont conservées et signalées par le contrôle de contenu.

Le français et le Dendi sont exportés avec leurs caractères et espaces originaux.
La phonétique est facultative : une valeur vide ou exactement `N/A` devient null
avec `phonetic_status=missing` ou `placeholder_na` et un motif de revue. La source
originale n’est pas modifiée. Les champs de provenance optionnels vides ou `N/A`
sont également représentés par null, sans exclure leur entrée.

Les doublons, ambiguïtés, séparateurs de variantes possibles « / », espaces
suspects et phonétiques partagées restent présents. `needs_review` indique un
signal automatique, accompagné de `review_reasons`. Ces motifs ne prouvent pas
qu’une entrée est erronée. Une absence de signal ne vaut pas validation.
Les variantes dans un même champ ne sont ni découpées ni réécrites dans les datasets.

`linguistic_validated=true` exige le statut explicite de l’inventaire et un
`validated_by` renseigné. Pour une ligne Speech, le fichier doit en plus être
marqué `validated: true` dans le manifeste. Une validation inconnue reste null,
une décision explicitement négative reste false. La validation d’un mot et celle
d’un enregistrement sont distinguées. Le corpus actuel ne dispose pas de validation
documentée ; la documentation ne présente aucune forme comme universelle.

## Schémas et références audio

Le lexique conserve `word_id`, `fr`, `dendi`, `phonetique`, `categorie`, `niveau`,
`variant_region`, `source`, `linguistic_validated`, `needs_review`, `has_audio`,
`audio_count`. Il expose aussi `validated_by`, `review_reasons` et `phonetic_status`.
Les IDs sont les entiers d’origine, sans renumérotation.

Une ligne Speech représente **un fichier déclaré**, pas simplement un mot.
`utterance_id` est le nom sans extension, par exemple `ddn_001_spk001`.
`audio_path` est relatif à la racine du dépôt, par exemple
`public/audio/dendi/ddn_001_spk001.wav`, indépendamment de la machine.
`audio_count` compte tous les locuteurs déclarés, y compris de futurs `spk002`,
`spk003`, etc. Les WAV hors manifeste ne sont pas inclus ; leurs noms sont
signalés dans la provenance. Un fichier déclaré absent ou invalide fait échouer
la construction, même si son entrée lexicale devait être exclue.

Les durées (arrondies à six décimales), fréquences d’échantillonnage, canaux et
tailles sont lus avec la bibliothèque standard Python `wave`. Les trames PCM
sont contrôlées ; le contrôle ne juge pas la prononciation ni le bruit.
Les CSV sont en UTF-8, séparateur virgule, fins de ligne LF. Les listes de motifs
sont encodées en JSON dans une cellule. Les JSONL utilisent des types natifs :
entiers, booléens, listes et null. La normalisation Unicode ne s’applique qu’aux
clés de comparaison, jamais aux formes lexicales exportées.

## Reconstruire et vérifier

Depuis la racine du dépôt, avec Python 3.9+ et sa bibliothèque standard :

```sh
python scripts/build-dendi-corpus.py
python scripts/validate-dendi-corpus.py
python -B -m unittest discover -s tests -p "test_*.py"
```

Les scripts ne font aucun appel réseau. Le build recalcule tous les décomptes,
y compris les audios et les locuteurs, depuis les fichiers sources courants.
Il n’exige aucun nombre de mots, d’audios ou de locuteurs codé en dur.

La validation compare aussi les CSV et JSONL aux sources, vérifie la préservation
Unicode et les métadonnées, les IDs, les associations audio, les motifs de revue
et la partition des splits. Elle échoue pour un export périmé ou altéré.
`source-provenance.json` conserve les SHA-256 des trois sources, du pipeline et
de chaque WAV. Il n’y a pas de date volatile dans les artefacts dérivés : une
reconstruction identique produit les mêmes octets.

Les empreintes des sources textuelles et des scripts utilisent des fins de ligne
LF canoniques, pour rester identiques après un checkout Git Windows ou Unix.
Cette règle ne modifie pas les textes sources ni leurs caractères Unicode.
Les empreintes des WAV portent toujours sur leurs octets bruts. `.gitattributes`
conserve les exports de `corpus/` en LF, indépendamment de `core.autocrlf`.

Le build remplace uniquement ses artefacts dérivés nommés. Il conserve ce README
et **ne remplace jamais un template de phrases déjà présent**, afin de préserver
une future collecte humaine. `--root`, `--output` et `--seed` permettent des tests
isolés ; les répertoires de production ne sont pas des destinations autorisées.
Aucune écriture Supabase et aucun changement de manifeste.

## Splits NLP et Speech

Seed fixe par défaut : **42**. Les paires FR/Dendi sont regroupées pour comparaison
après NFC, réduction des espaces et casefold ; leurs textes exportés restent bruts.
Un ordre SHA-256 dépendant de la seed répartit les groupes à environ 80/10/10.
Un doublon lexical exact ne peut donc pas apparaître à la fois dans train et test,
y compris si ses IDs ou catégories diffèrent. Les tailles en lignes peuvent varier
légèrement, car un groupe entier reste dans une seule partition.

Ces splits servent **uniquement à tester le pipeline**. Avec environ 182 entrées
lexicales, ils ne constituent PAS une base suffisante pour évaluer sérieusement
un modèle de traduction de phrases. Aucun score de modèle n’est calculé.

Aucun split Speech n’est créé pour ce lot. Quelques dizaines de WAV d’un seul
locuteur ne suffisent pas à mesurer une généralisation ASR. Si un split Speech
technique est ajouté ultérieurement, son usage devra être décrit ainsi :

> Ce split est destiné à valider le pipeline technique.
> Il n’est pas statistiquement suffisant pour mesurer la généralisation ASR.

## Baseline lexical local

```sh
python experiments/lexical_translation_baseline.py Bonjour
python experiments/lexical_translation_baseline.py Lundi
python experiments/lexical_translation_baseline.py nez
python experiments/lexical_translation_baseline.py Bonjor
python experiments/lexical_translation_baseline.py Litɛni --direction ddn-fr
```

Le **baseline lexical** consulte le lexique complet, sans entraînement neuronal.
Ses résultats ne sont pas une évaluation sur les splits. Il fait une recherche
exacte, puis normalisée (NFC, apostrophes, espaces ; casse ignorée en français).
La casse et les diacritiques Dendi restent significatifs pour la recherche.

Des alias de recherche proviennent des libellés déjà présents : annotations
parenthétiques, articles français et variantes séparées par « / ».
Ainsi « Bonjour » retourne les deux libellés « Bonjour (matin) » et
« Bonjour (après-midi) » avec leurs formes existantes ; « nez » retrouve « Le nez ».
Les sens et les formes sources restent visibles dans chaque résultat.

Une recherche fuzzy accepte au plus une insertion, suppression, substitution ou
transposition adjacente pour des clés d’au moins quatre caractères. Ces résultats
sont marqués `fuzzy` et `is_fuzzy_suggestion=true` ; ce sont des suggestions,
pas des traductions certaines. `--no-fuzzy` les désactive. Une requête sans entrée
correspondante produit une liste vide ; aucune phrase n’est assemblée ou inventée.
Les formes et variantes retournées sont exclusivement celles des lignes sources.

## Lexique, phrases et parole

- **Lexique** : mots et expressions associés à des sens ; il ne décrit pas à lui
  seul l’ordre des mots ni les transformations grammaticales des phrases.
- **Corpus parallèle** : phrases FR/Dendi alignées, collectées et relues ensemble.
  Le fichier `parallel/fr_dendi_sentences.csv` est initialement un en-tête vide.
- **Corpus Speech** : enregistrements et transcription exacte de ce qui est prononcé,
  reliés à des métadonnées documentées.
- **ASR** : reconnaissance de la parole, audio vers transcription.
- **TTS** : synthèse de la parole, texte vers audio.
- **Traduction automatique** : passage d’un texte dans une langue à un texte dans
  une autre. Un dictionnaire de correspondances n’est pas un traducteur de phrases.

Les formes Dendi des lignes Speech sont les **libellés lexicaux source associés**
aux fichiers. Elles ne sont pas présentées comme des transcriptions audio vérifiées
mot à mot. Certaines contiennent des variantes : une écoute et une transcription
exacte seront nécessaires avant toute utilisation ASR ou TTS supervisée.

## Étapes futures

1. **Phase 1 — Lexique existant + audios lexicaux.** Finaliser la revue des formes,
   variantes et associations audio ; documenter sources et validations.
2. **Phase 2 — 50+ mots avec spk001.** Étendre les enregistrements ; ce jalon de
   collecte ne justifie pas à lui seul un entraînement.
3. **Phase 3 — Plusieurs locuteurs.** Documenter les métadonnées réellement connues,
   les droits et les conditions de collecte ; préparer des évaluations par locuteur.
4. **Phase 4 — Phrases Dendi enregistrées + transcription exacte.** Aligner
   les prises et leurs transcriptions relues, avec un protocole de qualité.
5. **Phase 5 — Corpus parallèle FR-Dendi.** Collecter des phrases réellement
   traduites et validées, variées et traçables ; éviter les fuites entre partitions.
6. **Phase 6 — Premiers essais de fine-tuning traduction / ASR / TTS.** Les envisager
   après une collecte suffisante, une validation et des droits documentés, avec
   des jeux d’évaluation adaptés. Aucun essai neuronal n’est effectué ici.
