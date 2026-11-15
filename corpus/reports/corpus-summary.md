# Corpus Dendi v0.1

Rapport dérivé reproductible. Les sources de production sont lues sans modification.

- Entrées source : 182
- Entrées exclues pour N/A : 1
- Entrées exclues pour champs essentiels vides : 0
- Entrées lexicales exploitables : 181
- Entrées avec phonétique : 181
- Entrées sans phonétique : 0
- Mots avec au moins un audio : 27
- Nombre total d'audios : 27
- Nombre de locuteurs techniques : 1
- Couverture audio : 14.9171 %
- Entrées linguistiquement validées : 0
- Entrées à revoir : 28

Enregistrements détectés dans le manifeste (défaut + alternatives) : 27.
Le pilote est un fichier de suivi ; il ne limite pas les audios exportés.

## Exclusions explicites

- ID 10 : dendi:exact_N/A.

## Répartition par catégorie

| Groupe | Entrées | Avec audio | À revoir |
| --- | ---: | ---: | ---: |
| Salutations | 18 | 12 | 7 |
| corps | 54 | 0 | 15 |
| couleurs | 6 | 6 | 0 |
| noms | 26 | 0 | 3 |
| prepositions | 19 | 0 | 2 |
| temps__journee | 5 | 5 | 0 |
| temps__mois | 12 | 0 | 0 |
| temps__repere | 4 | 4 | 0 |
| temps__semaine | 7 | 0 | 0 |
| verbes | 30 | 0 | 1 |

## Répartition par niveau

| Groupe | Entrées | Avec audio | À revoir |
| --- | ---: | ---: | ---: |
| avance | 80 | 0 | 18 |
| debutant | 33 | 27 | 7 |
| intermediaire | 68 | 0 | 3 |

## Locuteurs techniques

| ID technique | Audios | Durée totale (s) |
| --- | ---: | ---: |
| spk001 | 27 | 62.560 |

Aucune identité, région, information démographique ou autorisation de diffusion n’est déduite de ces IDs.

## Présence audio

- Avec audio : 27.
- Sans audio : 154.

## Points à revoir

Les statuts sont des signaux de revue, pas des corrections ou des erreurs confirmées. Les lignes sont conservées.

- dendi_multiple_translations : 4 entrée(s).
- duplicate_lexical_pair : 2 entrée(s).
- exact_lexical_duplicate : 2 entrée(s).
- possible_variant_separator : 20 entrée(s).
- shared_phonetic : 8 entrée(s).
- source_characters_or_placeholder : 2 entrée(s).

### Groupes signalés par le contrôle existant

- Phonétiques partagées ; IDs 3, 4 : 'Fo nna wiciri !'
- Phonétiques partagées ; IDs 15, 16 : 'A chi demsu !'
- Phonétiques partagées ; IDs 55, 95 : 'Goosi'
- Phonétiques partagées ; IDs 148, 152 : 'Binni'
- Formes Dendi avec traductions différentes ; IDs 15, 16 : 'À cí demsu !'
- Formes Dendi avec traductions différentes ; IDs 148, 152 : 'Binni'
- Doublons lexicaux exacts (hors ID) ; IDs 55, 95 : Les cinq champs lexicaux sont identiques.
- Caractères ou espaces à vérifier ; IDs 5 : dendi : espaces en début/fin ; 'Fɔɔ '
- Caractères ou espaces à vérifier ; IDs 9 : dendi : espaces en début/fin ; ' Fɔɔ nna gbéi/ À sàabu'
- Caractères ou espaces à vérifier ; IDs 10 : dendi : valeur de remplacement possible ; 'N/A'
- Caractères ou espaces à vérifier ; IDs 10 : phonetique : valeur de remplacement possible ; 'N/A'

Les variantes indiquées par « / » restent dans leur champ original ; aucune forme n’est découpée ni réécrite dans les datasets.
Les validations inconnues restent null en JSONL et vides en CSV. Une valeur true exige une preuve déclarée et un relecteur.

## Splits techniques

Seed fixe : 42. Groupes par paire FR/Dendi normalisée pour comparaison seulement, allocation 80/10/10 par groupes.

- train : 145 lignes.
- validation : 18 lignes.
- test : 18 lignes.

Ces splits servent uniquement à tester le pipeline. Le volume lexical ne permet pas une évaluation sérieuse de traduction de phrases.
Aucun split Speech de performance n’est créé. Quelques dizaines de WAV d’un locuteur ne mesurent pas la généralisation ASR.
Le baseline lexical consulte le lexique complet : ses recherches ne sont pas des scores de généralisation.

## Provenance et reproductibilité

Les empreintes des sources, du pipeline et de chaque WAV sont dans source-provenance.json. Les artefacts ne contiennent pas de date volatile.
WAV déclarés rattachés à une entrée exclue : 0.
WAV hors manifeste, non inclus : 0.
