export const paymentNotice =
  "TY Space ne détient pas les fonds, ne prélève pas de commission et ne confirme pas le paiement. Le règlement se fait directement entre les personnes, par un moyen qu'elles choisissent et qui leur est légalement accessible.";

export const levelNotice = "Le niveau est déclaré par le membre. Ce n'est pas une certification.";

export const exerciseNotice = "Exercice fictif : ce projet n'a pas été réalisé pour un vrai client.";

export const publishReminder =
  "Ne publiez pas un travail confidentiel, un document client, des informations personnelles ou une création que vous n'avez pas le droit de partager.";

export const talentErrors: Record<string, string> = {
  contenu: "Ce texte n'est pas autorisé. Les contenus explicites, les coordonnées privées et les demandes de quitter TY Space sont refusés.",
  contact: "Ce contact n'est pas autorisé.",
  verification: "Cette mission nécessite une vérification avant de pouvoir candidater. Les missions rémunérées ne sont pas ouvertes aux moins de 18 ans tant que ce contrôle reste fermé.",
  autorisation: "Une autorisation enregistrée est nécessaire pour cette mission rémunérée. Un champ coché dans le navigateur ne suffit pas.",
  age: "Cette mission n'est pas ouverte à votre tranche d'âge.",
  suspendu: "Ce compte est suspendu.",
  retenu: "La modération a suspendu cette publication. Vous ne pouvez pas la republier vous-même.",
  benevole: "Une mission bénévole ne peut pas afficher un budget.",
  frequence: "Trop de tentatives. Réessayez plus tard.",
  statut: "Ce changement de statut n'est pas autorisé.",
  places: "Toutes les places sont déjà pourvues.",
  projet: "Un projet est déjà en cours entre ces personnes.",
  revisions: "Le nombre de révisions convenu est atteint.",
  annulation: "L'autre personne doit d'abord demander l'annulation.",
  litige: "Ce projet est en examen. Seule la modération peut le faire avancer.",
  conditions: "Les conditions convenues ne peuvent pas être modifiées ici. Proposez un avenant.",
  avis: "Cet avis n'est pas admissible.",
  langue: "Choisissez une langue proposée.",
  soi: "Vous ne pouvez pas répondre à votre propre annonce.",
  fermee: "Cette annonce n'est plus ouverte.",
  date: "La date limite est dépassée.",
  organisation: "Cette organisation doit encore être vérifiée avant de proposer la mission à un mineur.",
  profil: "Action non autorisée.",
  auth: "Connectez-vous pour continuer.",
  introuvable: "Élément introuvable.",
};

export function talentError(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  const known = Object.keys(talentErrors).find((key) => message.includes(key));
  return known ? talentErrors[known] : fallback;
}

export const availabilityLabels: Record<string, string> = {
  disponible: "Disponible",
  limitee: "Disponibilité limitée",
  indisponible: "Indisponible",
};

export const projectStatusLabels: Record<string, string> = {
  confirmed: "Projet confirmé",
  preparing: "En préparation",
  active: "En cours",
  delivered: "Livrable soumis",
  revision: "Révision demandée",
  accepted: "Livrable accepté",
  done: "Terminé",
  cancelled: "Annulé",
  dispute: "En examen",
};

export const applicationStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  reviewing: "En cours d'examen",
  shortlisted: "Présélectionnée",
  accepted: "Acceptée",
  refused: "Refusée",
  withdrawn: "Retirée",
  cancelled: "Annulée",
};

export const serviceStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  pending: "En vérification",
  published: "Publié",
  suspended: "Suspendu",
  archived: "Archivé",
  removed: "Supprimé",
};
