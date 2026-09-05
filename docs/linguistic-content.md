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

Le manifeste `lib/pronunciation-manifest.json` est volontairement vide.
Il associe la clé numérique de mots.id (clé JSON sous forme de chaîne décimale)
à un objet avec `path`, et éventuellement `speaker`, `variant`, `source`,
`recordedAt` (date ISO), `validated` (booléen). Ne pas inventer ces métadonnées.
L’absence de validated ne vaut pas validation. Vérifier humainement chaque
association entre mot et enregistrement avant de la publier.

1. Enregistrer un locuteur Dendi avec son accord de diffusion ; conserver
   la provenance, la zone/variété déclarée, la date et l’identité ou référence
   consentie du locuteur, ainsi que la trace de relecture et de validation.
2. Vérifier l’ID exact dans le corpus ; écouter et valider le fichier avec
   un relecteur natif. Vérifier format, volume, absence de coupure et de silence excessif.
3. Placer le vrai fichier dans `public/audio/dendi/{wordId}.mp3` (format recommandé),
   ou `.webm` / `.wav`. Le chemin public est `/audio/dendi/{wordId}.mp3`.
   Utiliser l’ID sans zéro initial, jamais seulement l’orthographe.
4. Ajouter uniquement cette entrée au manifeste avec son chemin réel et les
   métadonnées connues. Une entrée désigne actuellement un enregistrement ;
   le support de plusieurs variantes par mot pourra être décidé ultérieurement.
5. Exécuter TypeScript, lint, build et vérifier manuellement l’écoute.
   next.config.ts refuse un chemin non conforme, un fichier absent ou vide.
   Publier le manifeste et ses fichiers ensemble. Redémarrer le serveur de
   développement après un ajout pour relancer la vérification des assets.

Pas de 182 entrées factices, de TTS générique, de speechSynthesis, de voix
fabriquée à partir de la phonétique, de téléchargement Internet ni de son
repris d’une autre application. Aucun enregistrement n’a été ajouté dans cette passe.
Le stockage distant sera décidé séparément, sans migration Supabase ici.

## Deux systèmes indépendants

`public/sounds` contient seulement welcome.wav, correct.wav, incorrect.wav,
phase-complete.wav et lesson-complete.wav. SoundProvider conserve sa préférence
et son fonctionnement. Le contrôle est nommé « Sons de l’interface ».

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
