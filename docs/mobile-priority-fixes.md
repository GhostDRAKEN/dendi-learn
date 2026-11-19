# Corrections mobiles M01–M03

## Contenu pédagogique

`lib/curriculum.ts` centralise l'éligibilité : `fr` et `dendi` doivent être des chaînes non vides après examen des espaces, sans le marqueur `N/A` (casse ignorée). Les valeurs valides ne sont jamais réécrites. La phonétique est facultative ; un marqueur absent ou `N/A` n'est ni affiché ni utilisé comme question phonétique.

Le curriculum continue d'être réparti depuis les mots source, **avant filtrage**. Cela conserve les frontières, l'ordre, les identifiants et les numéros des leçons. Chaque liste pédagogique est ensuite filtrée. L'ID 10 reste dans les données source, mais n'entre plus dans les cartes, exercices, distracteurs, révisions et compteurs pédagogiques. Explorer et son quiz reçoivent le même contenu éligible ; le mot du jour applique aussi cette règle.

Une leçon entièrement indisponible conserve son identifiant pour les liens existants, ne produit aucun exercice et affiche un retour au parcours. Elle n'enregistre ni démarrage, ni complétion, ni maîtrise. Les recommandations et l'action de leçon suivante ignorent les listes vides. Les enregistrements historiques et les calculs de complétion de la phase 1 restent inchangés : aucune leçon indisponible n'est déclarée terminée automatiquement. Sa présence dans le programme nécessite une décision éditoriale humaine, pas une redistribution automatique.

La génération des exercices a été extraite sans changement de sélection ou de barème dans `lib/lesson-exercises.ts` pour tester les contenus effectivement proposés.

## Surfaces fixes

La hauteur réelle de la navigation et de la bannière est mesurée avec `ResizeObserver`. Les variables CSS `--bottom-nav-space` et `--signup-banner-space` réservent le même espace dans le document, dans le défilement et sous la bannière. La hauteur de la navigation inclut son padding de safe area. Le seuil reste 700 px.

Sur mobile, la bannière dispose de deux lignes : texte puis actions de 44 px minimum. Le lien d'inscription n'imbrique plus un bouton. La fermeture ne change pas son comportement. Un correctif de focus limité aux routes avec navigation inférieure complète `scroll-padding` : il déplace seulement le contrôle masqué dans la zone utile, sans animation ni changement du player. Le dialogue Quiz conserve son comportement actuel, hors périmètre.

## Contraste

L'orange de marque reste `#E07B39`. Les textes orange utilisent `--accent-text` (`#984719` en clair, `#F2AA7A` en sombre), et les fonds orange `--on-accent` (`#1A1A1A`). Les erreurs et succès disposent de tokens propres aux deux thèmes. Les indicateurs de focus utilisent la couleur de texte du thème. Les couleurs des niveaux gardent leurs teintes décoratives mais leurs textes disposent de variantes plus contrastées.

Les champs Auth conservent strictement leur logique actuelle ; seules leurs couleurs sont corrigées. Les états désactivés sont identifiés et contrôlés séparément des actions actives, conformément aux exceptions des critères de contraste.

## Tests

Tests Node : `node --test tests/*.test.mjs` (Node 24, déjà utilisé par le projet).

Tests navigateur : démarrer l'application puis exécuter `node tests/mobile-priorities.browser.mjs`. Ce test utilise Playwright fourni par l'environnement, sans ajout de dépendance au projet. Si nécessaire, définir `PLAYWRIGHT_MODULE` avec l'URL du module existant, `BROWSER_CHANNEL` (par défaut `msedge`), `TEST_BASE_URL` (par défaut `http://localhost:3001`) et `TEST_ARTIFACTS_DIR` pour les captures hors du dépôt. Les contextes sont invités, isolés et bloquent les écritures vers Supabase.

Les tests navigateur couvrent les quatre largeurs téléphone dans les deux thèmes, les états audio et une leçon complète avec révision. Les validations sur téléphone physique, clavier natif et lecteur d'écran restent distinctes de cette émulation.
