export const talentLanguages = [
  { code: "fr", label: "Français" },
  { code: "en", label: "Anglais" },
  { code: "es", label: "Espagnol" },
  { code: "ht", label: "Créole haïtien" },
  { code: "pt", label: "Portugais" },
] as const;

export const skillLevels = [
  { value: "decouverte", label: "Découverte" },
  { value: "pratique", label: "Pratique" },
  { value: "aise", label: "À l'aise" },
  { value: "avance", label: "Avancé" },
] as const;

export const offerKinds = [
  { value: "creation", label: "Création" },
  { value: "cours", label: "Cours ou tutorat" },
  { value: "conseil", label: "Conseil" },
  { value: "assistance", label: "Assistance" },
  { value: "autre", label: "Autre" },
] as const;

export const missionTypes = [
  { value: "educatif", label: "Projet éducatif" },
  { value: "creatif", label: "Collaboration créative" },
  { value: "benevole", label: "Mission bénévole" },
  { value: "remuneree", label: "Prestation rémunérée" },
  { value: "associatif", label: "Projet associatif" },
  { value: "concours", label: "Concours ou défi" },
  { value: "personnel", label: "Projet personnel" },
] as const;

export const clientKinds = [
  { value: "membre", label: "Membre de TY Space" },
  { value: "particulier", label: "Particulier" },
  { value: "association", label: "Association" },
  { value: "entreprise", label: "Entreprise" },
] as const;

export const portfolioOrigins = [
  { value: "personnel", label: "Projet personnel" },
  { value: "educatif", label: "Scolaire ou éducatif" },
  { value: "client", label: "Réalisé pour un client" },
  { value: "equipe", label: "Réalisé en équipe" },
  { value: "exercice", label: "Exercice fictif" },
] as const;

export const projectStatuses = [
  "confirmed",
  "preparing",
  "active",
  "delivered",
  "revision",
  "accepted",
  "done",
  "cancelled",
  "dispute",
] as const;

export type ProjectStatus = (typeof projectStatuses)[number];
export type MissionType = (typeof missionTypes)[number]["value"];
export type ClientKind = (typeof clientKinds)[number]["value"];

const minorBands = new Set(["12-15", "16-17"]);

export function isMinorBand(age: string) {
  return minorBands.has(age);
}

export function contactBlocked(actorAge: string, targetAge: string, blocked: boolean) {
  if (blocked) return true;
  if (actorAge === "23+" && (minorBands.has(targetAge) || targetAge === "unknown" || targetAge === "")) return true;
  if ((actorAge === "unknown" || actorAge === "") && minorBands.has(targetAge)) return true;
  return false;
}

export function eitherContactBlocked(leftAge: string, rightAge: string, blocked: boolean) {
  return contactBlocked(leftAge, rightAge, blocked) || contactBlocked(rightAge, leftAge, blocked);
}

export type ApplyInput = {
  actorAge: string;
  clientAge: string;
  blocked: boolean;
  suspended: boolean;
  self: boolean;
  missionType: string;
  openToMinors: boolean;
  clientKind: string;
  paidMinorsEnabled: boolean;
  orgOffersEnabled: boolean;
  authorizationGranted: boolean;
  deadlinePassed: boolean;
  published: boolean;
};

export function applyBlock(input: ApplyInput): string | null {
  if (input.suspended) return "suspendu";
  if (!input.published) return "fermee";
  if (input.self) return "soi";
  if (eitherContactBlocked(input.actorAge, input.clientAge, input.blocked)) return "contact";
  if (input.actorAge === "unknown" || input.actorAge === "") return "age";
  if (input.deadlinePassed) return "date";
  if (input.missionType === "remuneree" && isMinorBand(input.actorAge)) {
    if (!input.paidMinorsEnabled) return "verification";
    if (!input.authorizationGranted) return "autorisation";
  }
  if (isMinorBand(input.actorAge) && !input.openToMinors) return "age";
  if ((input.clientKind === "association" || input.clientKind === "entreprise") && input.openToMinors && !input.orgOffersEnabled) {
    return "organisation";
  }
  return null;
}

export function canPublishPaidOffer(age: string, paidMinorsEnabled: boolean, authorizationGranted: boolean) {
  if (age === "unknown" || age === "") return "age";
  if (!isMinorBand(age)) return null;
  if (!paidMinorsEnabled) return "verification";
  if (!authorizationGranted) return "autorisation";
  return null;
}

export function opportunityPublishStatus(input: {
  clientKind: string;
  openToMinors: boolean;
  orgOffersEnabled: boolean;
  missionType: string;
  budgetMode: string;
  budgetCents: number | null;
}): { status: "published" | "pending"; error: string | null } {
  if (input.missionType === "benevole" && (input.budgetMode === "indicatif" || (input.budgetCents ?? 0) > 0)) {
    return { status: "pending", error: "Une mission bénévole ne peut pas afficher un budget. Cela ressemblerait à un travail rémunéré déguisé." };
  }
  if (input.missionType === "remuneree" && input.budgetMode === "indicatif" && !(input.budgetCents && input.budgetCents > 0)) {
    return { status: "pending", error: "Indiquez un budget indicatif, ou choisissez « à discuter »." };
  }
  if ((input.clientKind === "association" || input.clientKind === "entreprise") && input.openToMinors && !input.orgOffersEnabled) {
    return { status: "pending", error: null };
  }
  return { status: "published", error: null };
}

const transitions: Record<ProjectStatus, ProjectStatus[]> = {
  confirmed: ["preparing", "cancelled", "dispute"],
  preparing: ["active", "cancelled", "dispute"],
  active: ["delivered", "cancelled", "dispute"],
  delivered: ["revision", "accepted", "dispute"],
  revision: ["delivered", "cancelled", "dispute"],
  accepted: ["done", "dispute"],
  done: [],
  cancelled: [],
  dispute: ["active", "cancelled", "done"],
};

export function canTransitionProject(from: ProjectStatus, to: ProjectStatus, asAdmin: boolean) {
  if (from === "dispute") return asAdmin && transitions.dispute.includes(to);
  if (asAdmin && to === "dispute" && from !== "done" && from !== "cancelled") return true;
  return transitions[from].includes(to);
}

function formatAmount(cents: number) {
  const major = Math.trunc(cents / 100);
  const minor = Math.abs(cents % 100);
  const grouped = String(major).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return minor ? `${grouped},${String(minor).padStart(2, "0")}` : grouped;
}

export function indicativePrice(cents: number | null, mode: "indicatif" | "convenir" | "discuter", currency: string) {
  if (mode === "convenir" || mode === "discuter" || cents == null) return "Prix à convenir";
  return `${formatAmount(cents)} ${currency} indicatif`;
}

export function estimateOffer(input: {
  packageCents: number | null;
  packageMode: "indicatif" | "convenir";
  currency: string;
  addons: { cents: number; currency: string; selected: boolean }[];
}) {
  const selected = input.addons.filter((item) => item.selected);
  if (selected.some((item) => item.currency !== input.currency)) {
    return { label: "", error: "Les options doivent utiliser la même devise que la formule." };
  }
  if (input.packageMode === "convenir" || input.packageCents == null) {
    return { label: "Prix à convenir", error: null as string | null };
  }
  const total = input.packageCents + selected.reduce((sum, item) => sum + item.cents, 0);
  return { label: `${formatAmount(total)} ${input.currency} estimé`, error: null as string | null };
}

const privateContact =
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const phone = /(?:^|[^\d])(\+?\d[\d ().-]{7,16}\d)/;
const offPlatform = /(whatsapp|telegram|snapchat|instagram|signal|discord|tiktok)/i;
const sensitiveAsk = /(mot de passe|code de verification|carte bancaire|western union|envoie une photo de toi|ton adresse|numero de telephone|adresse electronique)/i;

export function containsPrivateContact(value: string) {
  return privateContact.test(value) || phone.test(value);
}

export function containsOffPlatform(value: string) {
  return offPlatform.test(value) || sensitiveAsk.test(value);
}

export function profileProgress(input: {
  name: string;
  title: string;
  bio: string;
  categories: number;
  skills: number;
  availability: string;
  languages: number;
}) {
  const checks = [
    { ok: input.name.trim().length >= 2, label: "un nom professionnel ou un pseudonyme" },
    { ok: input.title.trim().length >= 2, label: "un titre" },
    { ok: input.bio.trim().length >= 40, label: "une présentation d'au moins quelques lignes" },
    { ok: input.categories > 0, label: "une catégorie" },
    { ok: input.skills > 0, label: "une compétence" },
    { ok: input.availability === "disponible" || input.availability === "limitee" || input.availability === "indisponible", label: "une disponibilité" },
    { ok: input.languages > 0, label: "une langue de travail" },
  ];
  return {
    done: checks.filter((item) => item.ok).length,
    total: checks.length,
    missing: checks.filter((item) => !item.ok).map((item) => item.label),
  };
}
