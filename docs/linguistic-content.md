# Contenu linguistique et enregistrements Dendi

## État du corpus

Inspection en lecture seule de Supabase le 5 septembre 2026 : 182 mots,
IDs numériques entiers uniques entre 1 et 193, avec des trous. Un ID n’est
ni un index de tableau ni un slug : ne jamais renuméroter le corpus.
`CurriculumMot` (lib/curriculum.ts) contient id, fr, dendi, phonetique,
categorie et niveau. Les cartes utilisent le même sous-ensemble sans niveau.
/apprendre lit mots via select('*'); le parcours sélectionne explicitement ces
six champs. Aucun changement de requête, schéma ou donnée n’est nécessaire.

La source et la variété du corpus ne sont pas documentées : nous ne pouvons
pas les affirmer. Faire relire les mots et leurs traductions par des locuteurs
Dendi compétents, documenter leur origine et respecter les variations régionales.
Ne pas présenter une forme comme universelle sans validation suffisante.
Le champ phonetique est une aide écrite, jamais une entrée de synthèse vocale.
Les IDs 3 et 4 partagent « Fo nna wiciri ! » : problème de contenu à revoir
avec validation humaine ; aucune correction automatique.

## Ajouter progressivement de vrais enregistrements

Le manifeste `lib/pronunciation-manifest.json` déclare les 27 WAV réels du lot
pilote intégré le 10 novembre 2026. Il associe l’ID décimal du mot à `path`,
`speakerId` et `format: "wav"`. Les champs `speaker`, `variant`, `source`,
`recordedAt` et `validated` restent optionnels : ils ne sont jamais déduits
automatiquement, hormis l’identifiant technique du locuteur inscrit dans le nom.
`spk001` ne donne aucune information sur son nom, sa région, son sexe ou son statut.

Convention officielle : `public/audio/dendi/ddn_{wordId sur au moins 3 chiffres}_{speakerId}.wav`.
Exemple réel pour l’ID 1 : `/audio/dendi/ddn_001_spk001.wav`.
L’ID du manifeste reste `"1"`, pas `"001"`. Les speaker IDs vont de `spk001`
à `spk999`. Le mot est complété à gauche à trois chiffres, sans zéro superflu.
L’ancienne convention `{wordId}.mp3`, `.webm` ou `.wav` est remplacée.
Les WAV existants ne sont ni renommés ni convertis.

L’entrée principale désigne le locuteur par défaut. Pour un futur deuxième
locuteur, déclarer son objet dans `alternatives`, avec son propre `path`,
`speakerId` et `format`, par exemple `ddn_001_spk002.wav`.
`getPronunciation(wordId)` conserve le défaut ; `getPronunciation(wordId, speakerId)`
peut résoudre une autre prise. Aucun sélecteur de locuteur n’est ajouté à l’UX.
Un couple mot/locuteur apparaît une seule fois. Tous les fichiers publics doivent
être déclarés ; un autre locuteur non déclaré est signalé comme orphelin.

Présence, intégration et validation linguistique sont trois états distincts.
L’intégration technique des fichiers réels est autorisée sans prétendre à une
validation humaine indépendante. Aucun des 27 fichiers n’a reçu `validated: true`.
Ce champ ne devient vrai qu’avec une décision documentée et un relecteur renseigné.
Le rapport conserve donc 27 fichiers présents/intégrés et 0 validation documentée.

Pour ajouter des fichiers :

1. Identifier l’ID exact et le speaker ID ; documenter séparément les informations
   réellement connues et conserver l’accord du locuteur dans un espace approprié.
2. Déposer les vrais WAV sous leur nom officiel, sans modifier le contenu linguistique.
3. Exécuter `python scripts/generate-pronunciation-manifest.py`. Le générateur
   refuse les fichiers invalides/inconnus et préserve les métadonnées existantes.
   Il ne fabrique aucune validation. Avec plusieurs locuteurs sans défaut existant,
   choisir explicitement `--default-speaker spk001`.
4. Exécuter `python scripts/check-pronunciation-assets.py --require-pilot` et
   consulter `docs/data/pronunciation-coverage.md`. L’option `--require-validation`
   rend les validations manquantes bloquantes dans un contrôle éditorial distinct.
5. Vérifier l’écoute sur téléphone, puis TypeScript, lint et build. Publier les
   fichiers et le manifeste ensemble. next.config.ts valide le nom, l’ID,
   les métadonnées techniques, l’unicité du locuteur et la présence du fichier.

Pas de TTS, de voix issue de la phonétique ou de téléchargement d’autres applications.
Le stockage distant sera décidé séparément, sans migration Supabase ici.

## Deux systèmes indépendants

`public/sounds` contient seulement welcome.wav, correct.wav, incorrect.wav,
phase-complete.wav et lesson-complete.wav. SoundProvider conserve sa préférence
et son fonctionnement. Le contrôle est nommé « Sons d’interface ».

PronunciationButton reçoit wordId, word et éventuellement audioUrl déjà résolue
et vérifiée par l’appelant. Les intégrations actuelles utilisent exclusivement
le manifeste. Aucun chemin n’est deviné ; sans entrée, aucun bouton ni requête.
Une URL explicitement fournie doit désigner un véritable enregistrement disponible ;
elle contourne la validation locale du manifeste et reste sous la responsabilité
 de l’appelant. Le composant gère les refus navigateur et erreurs réseau.

Le gestionnaire partagé pronunciation-player conserve un seul flux linguistique.
Une nouvelle lecture arrête et libère la précédente ; les promesses obsolètes
ne réactivent pas un son. Fin, arrêt, changement de mot et démontage libèrent
le flux. L’utilisateur lance et arrête au clavier ou au clic ; aucun autoplay.
Chargement, lecture et erreur sont indiqués par du texte, avec focus visible.
La préférence des jingles n’empêche pas d’écouter une prononciation.
Les deux canaux restent indépendants : un bref jingle peut coexister avec une
prononciation, mais deux prononciations ne se superposent jamais. Quitter la carte
arrête sa lecture, notamment avant de passer aux exercices.

Intégrations : phase Apprendre (après la phonétique et avant la traduction),
Révision guidée, cartes révélées de l’Explorer /apprendre via MotCard.
Aucun ajout dans les QCM, l’entraînement ou le Test classique.
Les exercices d’écoute et l’internationalisation sont hors de cette passe.

## TODO éditorial

Le workflow de contrôle et d’enregistrement est décrit dans
[le guide d’enregistrement](pronunciation-recording-guide.md).
L’inventaire, le rapport d’audit et le lot pilote sont dans `docs/data/`.
Le contrôle `python scripts/check-pronunciation-assets.py` vérifie les fichiers
et la validation documentée sans modifier le corpus ou le manifeste.

- Documenter la source des 182 mots.
- Documenter la variété/zone, sans la supposer.
- Identifier les relecteurs natifs et leur accord.
- Établir le statut et la trace de validation par mot/enregistrement.
- Revoir les phonétiques identiques des IDs 3 et 4 avec validation humaine.
