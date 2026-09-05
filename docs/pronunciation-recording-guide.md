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
   vers un format autorisé. Renommer l’extension ne convertit pas le fichier.

Une prise n’est finale qu’après écoute et validation linguistique humaine.
Les scripts ne peuvent pas attester de la vraie prononciation ni du consentement.

## Dossiers et noms

Les prises brutes, variantes et fichiers à relire restent dans un espace de
travail privé **hors de `public/` et hors du dépôt**. Un sous-dossier par ID
peut y regrouper les prises ; cette organisation privée n’est pas la convention
de publication. Aucun fichier de test ou non validé dans le manifeste.

Après validation, placer un seul fichier final par ID dans :

`public/audio/dendi/{word_id}.mp3`

Le chemin utilisé par le manifeste est `/audio/dendi/{word_id}.mp3`.
`.webm` et `.wav` sont aussi autorisés, en minuscules. Garder l’ID exact sans
zéro initial. Pas de nom fondé seulement sur l’orthographe. Si un autre format
autorisé est choisi, mettre à jour `expected_filename` dans le pilote.
Pas de variantes ni de plusieurs extensions pour un même ID dans le dossier public.

## Fichiers de suivi

- `docs/data/dendi-content-audit.csv` : inventaire de référence, 14 colonnes.
  Les six premiers champs sont copiés sans normalisation depuis Supabase.
  Les colonnes inconnues restent vides ; vide ne signifie ni faux ni validé.
- `docs/data/pronunciation-pilot.csv` : proposition de prises, pas un lot approuvé.
  `recorded` reste vide avant constat d’une prise réelle ; utiliser `true` une
  fois enregistrée. Ce statut ne donne aucune autorisation de publication.
- `linguistic_validated` : mettre `true` uniquement après validation documentée,
  `false` si une décision explicite de non-validation existe, sinon laisser vide.
  Reporter la décision dans les deux CSV, puis `validated_by` dans l’inventaire.
- `variant_region`, `source`, `audio_speaker` : informations connues uniquement.
  `source` désigne la provenance linguistique, pas simplement « Supabase ».
- `audio_status` peut suivre `recorded`, `in_review`, `validated`, `published` ;
  il reste vide dans l’export initial. `audio_file` contient seulement le nom
  final, par exemple l’ID suivi de `.mp3`, quand ce fichier a été intégré.
- `notes` peut contenir les remarques, la date d’enregistrement ISO, la référence
  de validation et les points à revoir, sans donnée personnelle non consentie.

Les CSV sont en UTF-8 avec BOM, séparateur virgule. Importer les colonnes
lexicales comme texte pour préserver accents, espaces et caractères Dendi.
Ne pas lancer de nettoyage, de correction orthographique ou de dédoublonnage automatique.

## Intégration du pilote

1. Faire relire le CSV pilote, puis enregistrer progressivement les candidats acceptés.
2. Valider le fichier réel et son association exacte à l’ID ; mettre à jour les
   annotations des CSV. Une correction linguistique proposée reste à traiter
   séparément avec accord humain, sans écraser les six colonnes sources ici.
3. Copier le fichier final dans le dossier public, puis ajouter uniquement son
   entrée à `lib/pronunciation-manifest.json` : `path`, `validated: true`, et les
   métadonnées connues (`speaker`, `variant`, `source`, `recordedAt`).
4. Le résolveur actuel affiche toute entrée du manifeste, sans filtrer `validated`.
   Le manifeste est donc une liste de publication, jamais une file d’attente.
   Le nouveau contrôle signale comme erreur toute entrée publiée sans
   `validated: true`, `linguistic_validated=true` et `validated_by` dans l’inventaire.
5. Exécuter les contrôles ci-dessous avant chaque intégration. Fichiers et
   manifeste doivent être livrés ensemble. Ne rien publier tant qu’une erreur
   de cohérence ou une validation manquante subsiste.
6. Écouter manuellement dans l’application sur téléphone : bon mot, bon son,
   début et fin entiers, volume confortable, arrêt/relecture fonctionnels.
   Vérifier l’écoute avec les sons d’interface désactivés.

Sans entrée dans le manifeste, le bouton reste masqué. Aucun audio synthétique,
aucun téléchargement Internet, aucune voix générée à partir de la phonétique.

## Commandes reproductibles

Depuis la racine du dépôt, Python 3.9+ sans dépendance externe :

```sh
python scripts/export-dendi-inventory.py --output docs/data/dendi-content-audit-new.csv
python scripts/audit-dendi-content.py --report docs/data/dendi-content-audit-report.md
python scripts/propose-pronunciation-pilot.py --output docs/data/pronunciation-pilot-new.csv
python scripts/check-pronunciation-assets.py --report docs/data/pronunciation-coverage.md
python scripts/check-pronunciation-assets.py --require-pilot
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

Le contrôle audio retourne 0 si la structure est cohérente, même si les prises
du pilote n’existent pas encore ; 1 en cas d’erreur de cohérence, ou de pilote
incomplet avec `--require-pilot` ; 2 si le contrôle ne peut pas s’exécuter.
Le mode strict doit donc échouer tant que les 27 mots ne sont pas intégrés et validés.
Le script vérifie noms, IDs, extensions, taille, doublons, orphelins, manifeste
et traces de validation. Il ne décode pas les codecs et ne mesure pas le bruit,
la durée ou la saturation : l’écoute technique et linguistique reste obligatoire.

La couverture distingue fichiers locaux et audio intégré avec validation
documentée ; elle est détaillée par niveau et catégorie. Aucun script n’est
ajouté automatiquement au build : exécuter explicitement ce contrôle avant publication.
