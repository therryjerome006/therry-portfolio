export const editorialCategories = [
  { id: "officiel", label: "Officiel" },
  { id: "tech", label: "Tech" },
  { id: "culture", label: "Culture" },
  { id: "sport", label: "Sport" },
  { id: "campus", label: "Campus" },
  { id: "creativite", label: "Créativité" },
] as const;

export const editorialKinds = [
  { id: "text", label: "Texte" },
  { id: "photo", label: "Photo" },
  { id: "video", label: "Vidéo" },
  { id: "article", label: "Article" },
] as const;

export const editorialStatuses = [
  { id: "draft", label: "Brouillon" },
  { id: "scheduled", label: "Programmé" },
  { id: "published", label: "Publié" },
  { id: "failed", label: "Échec" },
  { id: "archived", label: "Archivé" },
  { id: "hidden", label: "Masqué" },
] as const;

export const editorialTones = [
  { id: "informatif", label: "Informatif" },
  { id: "humoristique", label: "Humoristique" },
  { id: "pedagogique", label: "Pédagogique" },
  { id: "conversationnel", label: "Conversationnel" },
  { id: "inspirant", label: "Inspirant" },
] as const;

export const editorialLanguages = [
  { id: "fr", label: "Français" },
  { id: "ht", label: "Créole haïtien" },
  { id: "en", label: "Anglais" },
] as const;

export const editorialTimezones = ["America/Port-au-Prince", "UTC"] as const;

export const AI_BATCH_MAX = 8;

export type EditorialCategory = (typeof editorialCategories)[number]["id"];
export type EditorialKind = (typeof editorialKinds)[number]["id"];
export type EditorialStatus = (typeof editorialStatuses)[number]["id"];
export type EditorialTone = (typeof editorialTones)[number]["id"];
export type EditorialLanguage = (typeof editorialLanguages)[number]["id"];

export function categoryLabel(id: string) {
  return editorialCategories.find((item) => item.id === id)?.label || id;
}

export function kindLabel(id: string) {
  return editorialKinds.find((item) => item.id === id)?.label || id;
}

export function statusLabel(id: string) {
  return editorialStatuses.find((item) => item.id === id)?.label || id;
}

export function isEditorialCategory(value: string): value is EditorialCategory {
  return editorialCategories.some((item) => item.id === value);
}

export function isEditorialKind(value: string): value is EditorialKind {
  return editorialKinds.some((item) => item.id === value);
}

export function isEditorialStatus(value: string): value is EditorialStatus {
  return editorialStatuses.some((item) => item.id === value);
}
