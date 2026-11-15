# Suivi des leçons — Phase 1

## Diagnostic des sources existantes

- `lib/curriculum.ts` construit les niveaux, unités et leçons depuis les mots. La composition et l'ordre ne changent pas dans cette passe.
- Supabase `progression` stocke `user_id`, `mot_id`, `vu`, `maitrise`. Une découverte dans Explorer ou une réponse à un quiz peut aussi alimenter ces indicateurs : ils ne prouvent pas qu'une leçon guidée est terminée.
- La recommandation historique (`getRecommendedLesson`) privilégie des mots partiellement vus puis les leçons dont tous les mots ne sont pas maîtrisés. Elle reste un indice pédagogique, distinct de l'état d'une leçon.
- `dendi-guided-resume` était écrit dès l'ouverture de l'introduction et avançait vers la leçon suivante à la fin. Il ne prouve donc ni un démarrage ni une complétion. Il est conservé comme destination possible pour l'invité, sans rétroconversion en état.
- Aucun historique de fin de leçon, ni synchronisation du suivi invité vers un compte, n'était implémenté.

## Source de vérité ajoutée

`lib/lesson-progress.ts` utilise un registre local versionné :

- Invité : `dendi-guided-lessons:v1:guest`.
- Connecté : `dendi-guided-lessons:v1:user:{userId}`.
- Structure : `{ "version": 1, "lessons": { "lesson-id": { "startedAt": "ISO date", "updatedAt": "ISO date", "completedAt": "ISO date optionnelle" } } }`.

Les comptes et l'invité sont isolés ; aucun transfert automatique entre eux.

- **Non commencée** : aucune trace locale de démarrage dans ce registre.
- **En cours** : clic sur « Commencer la leçon », sans fin enregistrée.
- **Terminée** : passage réel par `finishLesson`, après Test et Révision si nécessaire, quel que soit le score. Ce n'est pas une mesure de maîtrise.
- **Recommandée** : destination proposée, sans changement d'état.

Deux appels dans `GuidedLesson` enregistrent le démarrage et la fin. Le déroulement pédagogique, les exercices, le score et les écritures existantes par mot restent identiques. Ouvrir seulement l'introduction ne marque pas de démarrage. Revoir une leçon terminée conserve sa complétion initiale. Les événements de stockage mettent la page à jour, y compris depuis un autre onglet.

La barre compte uniquement les IDs de leçons terminées appartenant au niveau affiché. Un ID inconnu ou un mot vu/maîtrisé n'augmente jamais le compteur. Les anciennes complétions ne sont pas reconstituées sans preuve. Après un changement de niveau, le dénominateur et les états sont recalculés pour ce niveau.

La prochaine action privilégie la leçon inachevée la plus récemment reprise, puis la destination locale invitée, puis la recommandation existante, toujours parmi les leçons non terminées du niveau choisi. Toutes les leçons restent accessibles pour commencer ou revoir. Un niveau terminé propose le niveau suivant disponible ; le dernier propose Explorer.

## Persistance et limites explicites

- Le registre persiste après rafraîchissement sur le même navigateur, pour l'invité comme pour un compte connecté.
- Le suivi des leçons **ne se synchronise pas entre appareils** : aucune table ni colonne distante ne le stocke actuellement. Les mots vus/maîtrisés continuent d'utiliser Supabase. L'interface distingue ces deux portées.
- Le suivi antérieur à cette version est inconnu ; « Non commencée » signifie ici « aucun démarrage enregistré sur cet appareil ». Il ne prétend pas établir l'historique absolu de l'utilisateur.
- « Reprendre » conserve le fonctionnement actuel : la leçon s'ouvre sur son introduction. La phase et la position intra-leçon ne sont pas sauvegardées dans cette passe.
- Si le stockage est bloqué, un secours en mémoire maintient le suivi dans l'onglet courant, avec une indication explicite. Il ne garantit pas la persistance après rechargement.
- Une future synchronisation des événements de leçons exigera une conception dédiée, puis validation préalable de toute migration et des règles d'accès. Aucune migration ni écriture Supabase supplémentaire ici.

## Vérifications

`node --test tests/lesson-progress.test.mjs` couvre les états, la recommandation indépendante, la non-assimilation des mots à une leçon, le calcul par niveau, la sérialisation, la répétition d'une leçon, les comptes isolés et les pannes de stockage. Les tests navigateur suivent de vrais parcours invités jusqu'au résultat ; leurs profils sont temporaires et leurs requêtes d'écriture distante sont bloquées.

Validation effectuée pour cette passe :

- 13 tests Node réussis : 9 pour le suivi des leçons, 4 pour la non-régression de la prononciation.
- Edge, build de production : première visite, introduction sans démarrage, démarrage réel, fin de chacune des 6 leçons Débutant, niveau complet, nouvelle tentative, changement de niveau et rafraîchissement. Compteurs identiques dans deux onglets, sans écriture distante.
- Rendus vérifiés à 390, 768 et 1280 px, en clair et sombre : absence de débordement, focus clavier, contrôle accessible de la barre et actions au toucher. Le menu de niveau reste au-dessus de la carte principale après les animations.
- TypeScript, lint et build réussis.
- L'isolation des comptes est testée automatiquement avec des fixtures locales. Aucune session de compte réel ni écriture de test Supabase n'a été utilisée ; la synchronisation distante existante des mots n'a pas été testée par une écriture en production.
