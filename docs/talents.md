# TY Space Talents

Talents est l'espace professionnel du réseau existant. Il réutilise les comptes Supabase Auth, les profils, les blocages, les signalements et les notifications. Il ne crée pas de second compte et ne gère aucun paiement.

## Ce qui fonctionne

- Vitrine professionnelle liée au profil, avec brouillon, publication et aperçu privé.
- Catégories administrables, avec sous-catégories, et compétences rattachées. Le niveau est déclaré, jamais présenté comme une certification.
- Formules Basique, Standard et Premium, options et montant estimé. Aucun paiement n'est lancé.
- Favoris privés, distincts des abonnements du fil.
- Portfolio : création, modification, publication, archivage, suppression confirmée, images privées servies par `/api/talents/fichier`.
- Services avec prix indicatif ou prix à convenir.
- Missions avec budget indicatif ou « à discuter ».
- Candidatures privées, une seule par membre et par mission.
- Demande de prestation, puis projet après acceptation.
- Étapes de projet, messages limités aux participants, livrables privés, avenant accepté par l'autre personne, avis seulement après une mission terminée.
- Signalement et blocage réutilisés.
- Administration : catégories, compétences, signalements, litiges, suspensions, autorisations et nettoyage limité des fichiers orphelins.

## Paiement

TY Space ne détient pas les fonds, ne prend pas de commission et ne marque jamais une mission comme payée. Le texte est affiché sur les services, les missions et les projets.

## Mineurs

Le contrôle `talent_policy.paid_minors_enabled` est faux par défaut. Tant qu'il reste faux, un membre de 12 à 17 ans ne peut ni voir, ni publier, ni demander une offre rémunérée. Une demande d'autorisation parentale peut être enregistrée, mais elle ne peut pas être accordée depuis le navigateur. Même une décision administrateur ne remplace pas une validation juridique.

`org_offers_enabled` est faux par défaut. Une association ou une entreprise qui coche l'ouverture aux mineurs obtient le statut `pending` et la mission n'est pas publique.

Une personne de 23 ans ou plus ne peut pas candidater, demander un service ou écrire dans un projet avec un membre de 12 à 17 ans. Le blocage existant s'applique aussi.

Aucun âge, aucune école, aucune adresse, aucun téléphone et aucun e-mail n'est affiché.

## Routes

- `/talents`, `/talents/decouvrir`, `/talents/services`, `/talents/services/nouveau`, `/talents/services/[id]`, `/talents/services/[id]/modifier`
- `/talents/opportunites`, `/talents/opportunites/nouveau`, `/talents/opportunites/[id]`, `/talents/opportunites/[id]/modifier`
- `/talents/profil/[username]`, `/talents/portfolio/[id]`
- `/talents/moi`, `/talents/moi/portfolio/nouveau`, `/talents/moi/portfolio/[id]`
- `/talents/moi/services`, `/talents/moi/candidatures`, `/talents/moi/projets`, `/talents/moi/projets/[id]`, `/talents/moi/reglages`
- `/talents/aide`
- `/admin/talents`
- `/api/talents/fichier`

## Données

Migration : `supabase/talents.sql`.

Tables principales : `talent_policy`, `talent_categories`, `skills`, `talent_profiles`, `talent_profile_categories`, `talent_skills`, `portfolio_items`, `portfolio_media`, `services`, `opportunities`, `applications`, `service_requests`, `talent_projects`, `project_messages`, `project_deliverables`, `project_amendments`, `talent_reviews`, `talent_authorizations`, `talent_authorization_notes`, `talent_audit`.

Les notes d'autorisation et le journal d'administration ne sont pas lisibles par les membres. Les candidatures, projets, messages et livrables ne sont lisibles que par les participants. RLS est activée. Les transitions sensibles sont aussi contrôlées par des triggers.

Le bucket `talent-files` est privé. Les fichiers ne sont pas dans un bucket public.

## Variables

Aucune nouvelle variable. Talents utilise `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` et `SUPABASE_SECRET_KEY`, déjà nécessaires au réseau et aux fichiers.

## Lancement local

```bash
npm run dev
```

Le site local est `http://localhost:3000/talents`.

## Déploiement

Appliquer `supabase/talents.sql` sur la base, puis déployer l'application comme les autres changements. Ne pas activer les deux contrôles de `talent_policy` avant une validation juridique réelle. Pour les ouvrir, l'administrateur doit saisir exactement `VALIDATION JURIDIQUE` dans `/admin/talents`. Cette phrase est un verrou opérationnel, pas une preuve de conformité.

## Retour arrière

La migration est additive. Pour la retirer : supprimer les politiques et tables `talent_*`, `skills`, `portfolio_*`, `services`, `service_*`, `opportunities`, `opportunity_skills`, `applications`, `application_works`, `project_*`, restaurer les contraintes précédentes de `reports` et `notifications`, puis supprimer le bucket `talent-files` s'il ne contient plus rien d'utile. Ne pas supprimer `profiles`, `reports` ou `notifications`.

## Limites

- Pas de paiement, pas d'entiercement, pas de commission.
- Pas de vérification d'identité ni de badge d'entreprise.
- Pas de scan des images au-delà du type réel et du retrait EXIF JPEG.
- Pas de messagerie générale : les messages existent seulement dans un projet accepté.
- Les avis injurieux se signalent et peuvent être masqués. L'administrateur ne réécrit pas le texte.
- La surveillance humaine n'est pas permanente.
- Les pages Talents ne sont pas mises dans le sitemap.

## Avant d'ouvrir les missions rémunérées aux mineurs

Faire valider, hors du code : l'âge, le pays, le type de contrat, l'autorisation parentale, la méthode de preuve et le fait qu'une association ou une entreprise puisse proposer une mission à un mineur. Tant que ce n'est pas fait, laisser `paid_minors_enabled` et `org_offers_enabled` à faux.
