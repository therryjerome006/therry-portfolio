/** Catégories des publications de /realisations. Le contenu se crée dans l'administration. */
export const activityCategories = [
  "Sport",
  "Échecs",
  "Compétitions",
  "Vie scolaire",
  "Événements",
  "Projets personnels",
] as const;

export type ActivityCategory = (typeof activityCategories)[number];
