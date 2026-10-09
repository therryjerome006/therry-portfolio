# Studio de contenu

Le studio se trouve dans l’administration, sous **Studio**. Il sert à préparer les publications des profils officiels de TY Space sans créer de compte membre pour chaque rubrique.

Les publications des membres restent dans `posts` et `community_articles`, avec leur auteur réel. Le studio n’écrit pas dans ces tables et ne change pas les auteurs déjà enregistrés.

Les profils éditoriaux ont une page publique `/redaction/[identifiant]`. Un membre connecté peut les suivre : l’abonnement est enregistré dans `follows`, à côté des abonnements entre membres, avec la colonne `editorial_id`. Leurs publications apparaissent alors dans l’onglet Suivis. Les favoris utilisent `saves.editorial_item_id`. Désactiver un profil laisse les publications et les abonnés en place. L’archivage retire le profil du public sans effacer cet historique. La migration correspondante est `supabase/editorial-social.sql`.

## Configuration

Variables serveur, jamais exposées au navigateur :

- `DATABASE_URL` et `SUPABASE_SECRET_KEY` : déjà utilisées par l’administration. La seconde sert aux photos et vidéos, dans les espaces existants `post-images`, `post-videos`, `article-images` et `avatars`.
- `CRON_SECRET` : protège `GET /api/editorial/publish`. Sans cette variable, la tâche répond 503 et ne publie rien. Le bouton **Publier les contenus dus** continue de fonctionner pour un administrateur connecté.
- `OPENAI_API_KEY` : active la génération de brouillons. Sans clé, ou avec `EDITORIAL_AI_PROVIDER=off`, l’éditeur manuel reste disponible.
- `EDITORIAL_AI_MODEL` : modèle optionnel. Par défaut, `gpt-4o-mini`.

La migration à appliquer est `supabase/editorial.sql`. Elle ajoute les profils, les contenus, le journal, les règles de diffusion et la fonction `editorial_release`. Elle ne supprime aucune donnée.

Sur Vercel, `vercel.json` appelle la tâche une fois par jour à 12:00 UTC. Il faut définir `CRON_SECRET` dans le projet : Vercel l’envoie dans `Authorization: Bearer`. Un plan qui n’autorise qu’une tâche par jour reste compatible avec cet horaire. Pour publier plus tôt, utiliser le bouton du studio.

## Utilisation

1. Ouvrir **Profils**, puis **Personnaliser** un présentateur : nom, identifiant, bio, lien `https` et photo. Chaque présentateur a sa page `/redaction/[identifiant]`, avec publications, articles, photos, vidéos et abonnés. Un ancien identifiant redirige vers le nouveau. La migration est `supabase/editorial-profile.sql`. Six profils sont préparés : Officiel, Tech, Culture, Arena, Campus et Créativité.
2. **Nouvelle publication** : choisir le profil, le format, le texte et, selon le cas, une photo, une vidéo MP4 de 15 secondes ou une couverture d’article.
3. Enregistrer un brouillon, publier tout de suite, ou programmer une heure dans le fuseau affiché (`America/Port-au-Prince` par défaut).
4. **Génération IA** : les textes arrivent en brouillons. Ils ne sont jamais publiés seuls. Les chiffres, dates et actualités sont à vérifier.
5. **Bibliothèque** et **Calendrier** : filtrer, modifier l’heure, annuler, dupliquer ou archiver. La duplication crée un nouvel identifiant.
6. **Historique** : créations, programmations, publications et échecs.

Un contenu programmé n’apparaît pas dans le fil avant l’heure. La tâche publie chaque contenu une seule fois. Si le profil est inactif, le média manque ou le texte est refusé, le statut passe à **Échec** et l’erreur est conservée. On peut corriger puis republier.

Les règles de diffusion limitent le nombre de publications par jour et l’intervalle minimum. On peut les modifier, ou suspendre les programmations automatiques. La publication manuelle d’un contenu choisi reste possible pendant une suspension.

## Limites

Les sondages et les publications à plusieurs images n’existent pas dans le réseau. Le studio ne les ajoute pas à côté du fil actuel. Une publication porte au plus une photo ou une vidéo, comme les cartes du fil.

Le bouton Enregistrer des publications personnelles ne s’applique pas aux contenus éditoriaux, parce qu’il pointe vers la table `posts`. Les likes, les commentaires et les signalements utilisent les tables déjà en place.

L’IA ne fabrique pas de likes, de commentaires, d’abonnés ni de témoignages présentés comme réels.
