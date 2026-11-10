# Enregistrer les prononciations Dendi

## Avant la séance

Le lot proposé contient 27 mots : 12 salutations, 9 mots de temps essentiel
et 6 couleurs. Il reprend les catégories Débutant du curriculum actuel, par ID
croissant. Les jours de la semaine appartiennent actuellement au niveau
Intermédiaire : ils ne sont pas déplacés dans cette passe.

Les IDs 3, 4, 5, 9, 10, 15 et 16 sont différés dans le pilote à cause de signaux
d’audit à examiner. Ils restent intégralement dans le corpus et l’inventaire.
L’absence de signal sur les 27 candidats ne vaut pas validation.

Avec un locuteur et un relecteur Dendi, vérifier le sens, la forme et la variété
de chaque entrée avant d’en faire une prise finale. La phonétique écrite est
une aide non validée, jamais une consigne de synthèse vocale. Ne pas demander
au locuteur d’imiter une transcription qu’il juge incorrecte. Noter son avis,
sans corriger automatiquement le corpus. Pour une expression avec plusieurs
variantes ou sens, décider humainement quelle forme précise sera enregistrée.

Documenter l’origine du mot quand elle est connue, la zone/variété déclarée,
la référence du locuteur et son accord de diffusion, la date, le relecteur et
sa décision. L’application ne doit pas présenter cette forme comme universelle.
Conserver les coordonnées personnelles et justificatifs d’accord dans un espace
privé ; les CSV et métadonnées publiés ne contiennent que les références consenties.

## Enregistrer au téléphone

1. Choisir une pièce silencieuse. Couper télévision, musique et notifications.
2. Poser le téléphone et garder une distance constante, environ 15 à 25 cm
   pour commencer. Faire un essai afin de vérifier que la voix ne sature pas.
3. Enregistrer un seul mot ou une seule expression par fichier. Ne pas prononcer
   son numéro, la traduction française ou une annonce dans la prise finale.
4. Laisser un silence court avant et après, sans couper les premiers ou derniers sons.
5. Parler naturellement, à un volume habituel. Ne pas exagérer les syllabes.
6. Réécouter. En cas de bruit, de souffle gênant, d’hésitation ou de coupure,
   refaire la prise plutôt que masquer le problème par des traitements excessifs.
7. Garder l’original du téléphone. Le transférer comme fichier original,
   sans passer par un service qui recompresse les messages vocaux.
8. Ne pas compresser plusieurs fois. Si le téléphone produit du M4A, le garder
   comme original hors application puis faire au besoin une seule conversion
   vers le WAV de publication. Les WAV réels actuellement fournis sont conservés intacts, sans conversion. Renommer l’extension ne convertit pas le fichier.

Une prise n’est finale qu’après écoute et validation linguistique humaine.
Les scripts ne peuvent pas attester de la vraie prononciation ni du consentement.

## Dossiers et noms

Les prises de travail restent dans un espace privé hors de `public/`. Les vrais
WAV intégrés utilisent désormais la convention officielle :

`public/audio/dendi/ddn_{word_id sur au moins 3 chiffres}_{speaker_id}.wav`

Exemples réels : `ddn_001_spk001.wav`, `ddn_011_spk001.wav`, `ddn_188_spk001.wav`.
Pour le mot 1, le chemin public est `/audio/dendi/ddn_001_spk001.wav`.
L’ID lexical reste l’entier 1. Utiliser le remplissage minimum à trois chiffres ;
`ddn_0001_spk001.wav` est rejeté. `speaker_id` suit `spk001` à `spk999`.
Seule l’extension `.wav` minuscule est utilisée par cette convention.

Ne pas renommer les WAV fournis en noms basés sur l’orthographe ou l’ancien
`1.mp3`. Ne pas les convertir en MP3. Une prise par couple mot/locuteur ;
un deuxième locuteur utilise `ddn_001_spk002.wav`. Il doit être déclaré comme
alternative dans le manifeste pour ne pas rester orphelin. Aucun doublon exact
de chemin, de couple mot/locuteur ou de contenu audio n’est accepté.

## Fichiers de suivi

- `docs/data/dendi-content-audit.csv` : inventaire de référence, 14 colonnes.
  Les six premiers champs sont copiés sans normalisation depuis Supabase.
  Les colonnes inconnues restent vides ; vide ne signifie ni faux ni validé.
- `docs/data/pronunciation-pilot.csv` : proposition de prises, pas un lot approuvé.
  `recorded=true` indique la présence constatée d’une prise réelle. Les 27 prises
  sont actuellement présentes et intégrées, sans validation linguistique documentée.
  La colonne `linguistic_validated` reste vide ; ces états ne se confondent pas.
- `linguistic_validated` : mettre `true` uniquement après validation documentée,
  `false` si une décision explicite de non-validation existe, sinon laisser vide.
  Reporter la décision dans les deux CSV, puis `validated_by` dans l’inventaire.
- `variant_region`, `source`, `audio_speaker` : informations connues uniquement.
  `source` désigne la provenance linguistique, pas simplement « Supabase ».
- `audio_status` peut suivre `recorded`, `in_review`, `validated`, `published` ;
  il reste vide dans l’export initial. `audio_file` contient seulement le nom
  officiel, tel que `ddn_001_spk001.wav`, si cette annotation est renseignée.
  Le rapport technique calcule présence/intégration depuis les fichiers et le manifeste,
  sans remplir automatiquement les annotations de l’inventaire.
- `notes` peut contenir les remarques, la date d’enregistrement ISO, la référence
  de validation et les points à revoir, sans donnée personnelle non consentie.

Les CSV sont en UTF-8 avec BOM, séparateur virgule. Importer les colonnes
lexicales comme texte pour préserver accents, espaces et caractères Dendi.
Ne pas lancer de nettoyage, de correction orthographique ou de dédoublonnage automatique.

## Intégration du pilote

1. Enregistrer les mots avec leur ID exact et faire documenter leur variété et leur
   relecture lorsque ces informations sont disponibles. Ne pas corriger les textes
   source automatiquement.
2. Placer les vrais WAV dans le dossier public et lancer le générateur de manifeste.
   Il ajoute seulement `path`, `speakerId`, `format: "wav"` et conserve les métadonnées
   connues des entrées existantes. Il ne marque jamais un fichier comme validé.
3. La racine de chaque entrée reste le défaut de lecture ; `alternatives` peut
   contenir d’autres locuteurs. Le générateur préserve le défaut existant et exige
   un choix explicite si plusieurs locuteurs sont nouveaux.
4. Le résolveur affiche le bouton pour tout fichier déclaré, indépendamment du champ
   `validated`. Cette disponibilité technique ne signifie pas validation linguistique.
   Ne définir `validated: true` qu’après décision explicite avec
   `linguistic_validated=true` et `validated_by` dans l’inventaire. Le contrôle
   signale une validation annoncée sans ces justificatifs.
5. Exécuter les contrôles techniques et consulter les trois états du rapport pilote.
   Le contrôle éditorial `--require-validation` reste distinct et échoue actuellement,
   puisque les 27 enregistrements n’ont pas de validation documentée.
6. Écouter manuellement dans l’application : bon mot, début et fin entiers, volume
   confortable, arrêt/relecture. Vérifier avec les sons d’interface désactivés.
   Le contrôle Python vérifie le WAV PCM et ses trames, mais ne juge pas la langue.

Sans fichier déclaré pour un mot, aucun bouton n’apparaît. Aucune synthèse vocale.

## Commandes reproductibles

Depuis la racine du dépôt, Python 3.9+ sans dépendance externe :

```sh
python scripts/export-dendi-inventory.py --output docs/data/dendi-content-audit-new.csv
python scripts/audit-dendi-content.py --report docs/data/dendi-content-audit-report.md
python scripts/propose-pronunciation-pilot.py --output docs/data/pronunciation-pilot-new.csv
python scripts/generate-pronunciation-manifest.py
python scripts/check-pronunciation-assets.py --report docs/data/pronunciation-coverage.md
python scripts/check-pronunciation-assets.py --require-pilot
python scripts/check-pronunciation-assets.py --require-pilot --require-validation
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

L’export utilise exclusivement GET et les paramètres publics Supabase de
`.env.local` ou de l’environnement. Il refuse d’écraser un fichier existant :
comparer les nouveaux exports par ID pour préserver les annotations humaines.
Éviter de modifier le corpus distant pendant un export paginé. Le script de
proposition refuse également d’écraser un pilote annoté.

Audit et contrôle audio lisent uniquement les entrées ; ils affichent leur
rapport. `--report` écrit seulement le rapport dérivé demandé. Le contrôle
audio ne télécharge rien, ne répare rien et ne modifie jamais le manifeste.

Le contrôle audio retourne 0 si la structure est cohérente, 1 en cas d’erreur
ou d’exigence non satisfaite, 2 si le contrôle ne peut pas s’exécuter.
`--require-pilot` exige la présence et l’intégration des fichiers attendus ; il passe
pour les 27 WAV actuels. `--require-validation` exige une validation documentée de
chaque enregistrement intégré ; il ne passe pas pour ce lot non encore relu.

Le script contrôle noms, speaker IDs, IDs lexicaux, extensions, tailles, WAV PCM
complets, doublons exacts, orphelins et cohérence du manifeste. La couverture
technique est calculée séparément de la validation, par niveau et catégorie.
Il ne mesure pas le bruit, la saturation ou l’adéquation linguistique.
Aucun contrôle Python n’est ajouté automatiquement au build.
