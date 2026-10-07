export const ageBands = [
  { value: "12-15", label: "12 à 15 ans" },
  { value: "16-17", label: "16 à 17 ans" },
  { value: "18-22", label: "18 à 22 ans" },
  { value: "23+", label: "23 ans et plus" },
] as const;

export const reportReasons = [
  { value: "spam", label: "Spam" },
  { value: "harcelement", label: "Harcèlement" },
  { value: "insultes", label: "Insultes" },
  { value: "sexuel", label: "Contenu sexuel" },
  { value: "violence", label: "Violence" },
  { value: "haine", label: "Haine" },
  { value: "arnaque", label: "Arnaque" },
  { value: "usurpation", label: "Usurpation" },
  { value: "autre", label: "Autre" },
] as const;

export const articleCategories = [
  "Programmation",
  "Sport",
  "Éducation",
  "Gaming",
  "Musique",
  "Expériences",
  "Sciences",
  "Culture",
  "Technologie",
  "Actualités",
  "Passions",
] as const;

export const feedTabs = [
  { id: "pour-toi", label: "Pour toi" },
  { id: "suivis", label: "Suivis" },
  { id: "tendances", label: "Tendances" },
  { id: "recent", label: "Récent" },
] as const;

export type FeedTab = (typeof feedTabs)[number]["id"];
export type ReportReason = (typeof reportReasons)[number]["value"];

export const PAGE_SIZE = 8;
export const MAX_VIDEO_SECONDS = 15;
export const MAX_VIDEO_BYTES = 26_214_400;
export const MAX_IMAGE_BYTES = 8_388_608;
export const MAX_AVATAR_BYTES = 2_097_152;

export type AgeBand = (typeof ageBands)[number]["value"];

export function isAgeBand(value: string): value is AgeBand {
  return ageBands.some((band) => band.value === value);
}

export function audienceChoices(ageBand: string): AgeBand[] {
  if (ageBand === "12-15" || ageBand === "16-17") return ["12-15", "16-17"];
  if (ageBand === "18-22") return ["12-15", "16-17", "18-22", "23+"];
  return ["18-22", "23+"];
}

export function defaultAudience(ageBand: string): AgeBand[] {
  if (ageBand === "12-15" || ageBand === "16-17") return ["12-15", "16-17"];
  if (ageBand === "18-22") return ["12-15", "16-17", "18-22"];
  return ["18-22", "23+"];
}

export function audienceLabel(values: string[]) {
  return ageBands
    .filter((band) => values.includes(band.value))
    .map((band) => band.label)
    .join(", ");
}

export function canJoinSchool(ageBand: string) {
  return ageBand === "12-15" || ageBand === "16-17" || ageBand === "18-22";
}

export function isReportReason(value: string): value is ReportReason {
  return reportReasons.some((reason) => reason.value === value);
}

export function isFeedTab(value: string): value is FeedTab {
  return feedTabs.some((tab) => tab.id === value);
}
