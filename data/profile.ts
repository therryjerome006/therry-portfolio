/**
 * Coordonnées publiques.
 * Laissez une chaîne vide pour masquer le lien correspondant.
 * `phone` active l'appel et le bouton WhatsApp (format international, ex. +50900000000).
 * `whatsapp` reste vide : le lien est construit depuis `phone`. Mettez une URL seulement pour la remplacer.
 * Ajoutez votre CV PDF dans `public/cv.pdf`, puis remplacez `cvUrl` par "/cv.pdf".
 */
export const profile = {
  name: "Therry Adler Jérôme",
  role: "Software Developer",
  email: "",
  phone: "+509 44895405",
  github: "",
  linkedin: "",
  whatsapp: "",
  cvUrl: "/cv",
  summary:
    "Développeur passionné par la création d'applications web modernes, les nouvelles technologies et la résolution de problèmes par le code.",
} as const;

export function whatsappLink(phone: string, explicit: string) {
  if (explicit.trim()) return explicit.trim();
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export const socialUsername = "tygee";

export const siteDescription =
  "TY Space est un réseau social pour publier des twits, des photos, des vidéos courtes et des articles. L'espace du développeur Therry Adler Jérôme y présente aussi ses projets.";
