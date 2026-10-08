# Espace personnel

L'espace connecté est `/profil`. Les sections sont des paramètres (`?espace=`), pas des chemins, pour ne pas entrer en conflit avec `/profil/[username]`.

Sections : aperçu, modification, publications, médias, interactions, abonnements, enregistrements, réglages.

## Migration

Appliquer `supabase/profile-space.sql` après `editorial-social.sql`.

Elle ajoute :

- `profiles.website` : lien `https` facultatif, 120 caractères maximum.
- `profiles.show_relations` : vrai par défaut. Si faux, les listes d'abonnés et d'abonnements ne sont plus lisibles par les autres. Les compteurs passent par `profile_relation_count`, donc ils restent exacts.
- `profile_names` : conserve l'ancien nom d'utilisateur. `/profil/ancien-nom` redirige vers le nom actuel. Les abonnements restent liés à l'identifiant du compte.

Les abonnements aux profils éditoriaux restent visibles pour les compteurs publics. Un membre voit toujours ses propres relations, même s'il masque les listes.

## Ce qui n'est pas ajouté

- Pas de brouillons personnels : les publications n'ont pas ce statut. Les brouillons éditoriaux restent dans le Studio, réservé à l'administration.
- Pas d'image de couverture : le profil public n'en utilisait pas.
- Pas d'interrupteur de langue ni de notifications décoratif. Les notifications se consultent sur `/notifications`. Le thème se change dans l'en-tête.
- L'e-mail, le téléphone et la tranche d'âge ne sont pas affichés.

## Suppression de compte

Le bouton des réglages appelle la suppression du compte d'authentification après confirmation du nom d'utilisateur. Les publications, commentaires, médias liés et relations partent avec le profil par cascade. Les contenus éditoriaux ne sont pas touchés.
