# Suivi des mots et des leçons

| Métrique | Invité | Compte connecté |
| --- | --- | --- |
| **Mots consultés dans Explorer** | Révélation d’une carte. Identifiants uniques dans `localStorage`, sous `dendi-explorer-words:v1:guest`. Persistance limitée à ce navigateur et à cette origine. En cas d’échec du stockage, les consultations récentes restent dans l’onglet. | La révélation conserve l’écriture existante `vu: true` sur `progression`, avec la clé `(user_id, mot_id)`. |
| **Mots vus sur le compte** | Pas de compteur de compte. | Lecture de `progression` avec `user_id` et `vu: true`. Ce booléen historique inclut des cartes révélées, des mots présentés en leçon et des réussites au Quiz ou au test guidé. Il ne permet pas d’attribuer chaque mot à Explorer. |
| **Mots maîtrisés** | Les bonnes réponses influencent le score du Quiz ou du test guidé. En invité, ces résultats n’alimentent pas de registre de maîtrise. | La bonne réponse au Quiz ou au test guidé conserve l’écriture existante `maitrise: true`. La recherche, la révélation ou l’écoute ne déclenchent pas cette écriture. La maîtrise enregistrée est relue depuis `progression` dans le Profil. |
| **Leçons commencées** | Événement `started` au clic sur « Commencer la leçon », via `recordLessonEvent`. Registre local par identifiant de leçon. | Même registre local, avec une clé propre au compte. |
| **Leçons terminées** | Événement `completed` à la fin du parcours de la leçon. Parcours compte ces événements par unité et par niveau. | Même règle et même stockage local propre au compte. Les lignes Supabase sur les mots ne prouvent pas qu’une leçon est terminée. |

Le compteur Explorer rapporte les identifiants présents dans les résultats de recherche, de catégorie et de niveau. Le total utilisé par la bannière est le nombre de mots uniques consultés par l’invité dans ce navigateur, tous filtres confondus. Le Profil du compte utilise les mots exploitables du catalogue actuel comme périmètre de ses statistiques.

## Changements de session et stockage

Explorer attend l’identité de session avant d’afficher un nombre. Les événements de l’authentification sélectionnent l’historique invité ou la lecture du compte. Les requêtes et les retours d’écriture sont rattachés à la session d’affichage qui les a déclenchés. La consultation invitée reste locale, y compris à l’inscription ou à la connexion. Après déconnexion, Explorer retrouve l’historique invité du navigateur. Le Profil chargé avec une nouvelle identité réinitialise ses données d’affichage par clé de compte.

Si la clé invitée est illisible, sa valeur est conservée et Explorer indique que les nouveaux mots restent dans l’onglet. L’action explicite de réinitialisation crée un registre lisible avec les identifiants encore disponibles en mémoire. Effacer les données du site dans le navigateur efface les données locales sauvegardées.

## Vérifications et limites

Les scénarios de compte sont simulés et couvrent la connexion, la déconnexion, le changement de compte, les réponses tardives et les erreurs réseau. Les essais navigateur utilisent des sessions invitées. La synchronisation réelle entre appareils et la configuration RLS du service déployé n’ont pas été vérifiées. Un historique de cartes propre aux comptes nécessiterait de distinguer la source du champ `vu`. Le registre des leçons, son éventuel transfert et sa synchronisation relèvent d’une décision séparée.
