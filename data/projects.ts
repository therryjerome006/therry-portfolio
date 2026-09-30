export const projectFilters = [
  "Tous",
  "Web",
  "E-commerce",
  "SaaS",
  "Gaming",
  "Client Projects",
] as const;

export type ProjectFilter = (typeof projectFilters)[number];
export type ProjectCategory = Exclude<ProjectFilter, "Tous">;

/**
 * Ajoute une photo ou une vidéo dans `media`, puis dépose le fichier dans `public/`.
 * `src` commence par `/`. Pour une vidéo, `poster` est l'image affichée avant la lecture.
 */
export type ProjectMedia =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; src: string; alt: string; poster: string };

export type ProjectTheme = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  line: string;
  radius: string;
  buttonRadius: string;
};

export type Project = {
  slug: string;
  name: string;
  summary: string;
  overview: string;
  problem: string;
  solution: string;
  features: string[];
  technologies: string[];
  challenges: string[];
  result: string;
  status: string;
  categories: ProjectCategory[];
  liveUrl: string;
  codeUrl?: string;
  image: string;
  imageAlt: string;
  theme: ProjectTheme;
  media: ProjectMedia[];
};

export const projects: Project[] = [
  {
    slug: "achatplus",
    name: "AchatPlus",
    summary:
      "Marketplace multi-vendeurs orientée vers le marché haïtien, avec boutiques, produits, commandes et espaces de gestion.",
    overview:
      "AchatPlus est une marketplace multi-vendeurs. Le projet réunit les parcours d'un acheteur et ceux d'un vendeur : découvrir des produits, gérer une boutique, suivre des commandes, et administrer l'activité.",
    problem:
      "Relier plusieurs vendeurs, leurs produits et les commandes des clients dans une même application, sans mélanger les espaces de chacun.",
    solution:
      "Une application web qui sépare les rôles et les données : vitrines publiques, gestion des boutiques, suivi des commandes, et tableaux de bord pour piloter l'activité.",
    features: [
      "Marketplace multi-vendeurs",
      "Gestion des boutiques",
      "Produits",
      "Commandes",
      "Paiements",
      "Livraison",
      "Tableaux de bord",
      "Gestion des vendeurs",
    ],
    technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Supabase", "PostgreSQL"],
    challenges: [
      "Modéliser boutiques, produits et commandes pour qu'un vendeur ne voie que son propre espace.",
      "Relier le parcours d'achat au suivi des commandes, des paiements et de la livraison.",
      "Garder une interface claire alors que l'application sert à la fois les clients, les vendeurs et l'administration.",
    ],
    result:
      "Le projet est en ligne. Il présente une marketplace fonctionnelle, de la vitrine jusqu'aux espaces de gestion.",
    status: "En ligne",
    categories: ["Web", "E-commerce"],
    liveUrl: "https://achatplusht.vercel.app",
    image: "/projects/achatplus/ordinateurs.jpg",
    imageAlt: "Photo de la catégorie ordinateurs sur AchatPlus",
    theme: {
      bg: "#f5f7f8",
      surface: "#ffffff",
      ink: "#17202a",
      muted: "#64748b",
      accent: "#087ea4",
      accentInk: "#ffffff",
      line: "#e2e8f0",
      radius: "16px",
      buttonRadius: "999px",
    },
    media: [
      {
        kind: "image",
        src: "/projects/achatplus/hero.jpg",
        alt: "Identité AchatPlus : logo bleu et rouge, citadelle et palmier",
      },
      {
        kind: "image",
        src: "/projects/achatplus/ordinateurs.jpg",
        alt: "Visuel de la catégorie ordinateurs",
      },
      {
        kind: "image",
        src: "/projects/achatplus/peripheriques.jpg",
        alt: "Visuel de la catégorie périphériques",
      },
      {
        kind: "image",
        src: "/projects/achatplus/jeux.jpg",
        alt: "Visuel de la catégorie jeux",
      },
      {
        kind: "video",
        src: "/projects/achatplus/catalogue.mp4",
        poster: "/projects/achatplus/ordinateurs.jpg",
        alt: "Vidéo du catalogue AchatPlus",
      },
    ],
  },
  {
    slug: "bon-accueil-hotel",
    name: "Bon Accueil Hotel",
    summary:
      "Site moderne pour un hôtel à Jacmel : présentation, chambres, filtres, réservation et contact.",
    overview:
      "Bon Accueil Hotel est le site d'un hôtel situé à Jacmel. Il présente l'établissement, ses chambres, et permet de filtrer l'offre, de réserver, et de contacter l'hôtel.",
    problem:
      "Permettre à un visiteur de comprendre l'hôtel, de comparer les chambres et de lancer une réservation sans quitter le site.",
    solution:
      "Un site structuré autour de la présentation, du catalogue de chambres et d'un parcours de réservation, avec authentification, contact et un accès WhatsApp.",
    features: [
      "Présentation de l'hôtel",
      "Chambres",
      "Filtres",
      "Réservation",
      "Authentification",
      "Contact",
      "Intégration WhatsApp",
    ],
    technologies: ["Next.js", "React", "Supabase", "Tailwind CSS"],
    challenges: [
      "Rendre le choix d'une chambre lisible, avec des filtres qui restent simples.",
      "Relier la réservation à un compte utilisateur sans alourdir le parcours.",
      "Garder un contact direct possible, y compris via WhatsApp.",
    ],
    result:
      "Le site est en ligne et présente l'hôtel, ses chambres et les parcours de réservation et de contact.",
    status: "En ligne",
    categories: ["Web", "Client Projects"],
    liveUrl: "https://bon-accueil.vercel.app",
    image: "/projects/bon-accueil/accueil.jpg",
    imageAlt: "Entrée de l'hôtel Bon Accueil à Jacmel, maison jaune dans le jardin",
    theme: {
      bg: "#fbf8f1",
      surface: "#fbf8f1",
      ink: "#221f1a",
      muted: "#3c4a40",
      accent: "#1b3d2f",
      accentInk: "#fbf8f1",
      line: "#e8dcc4",
      radius: "0px",
      buttonRadius: "0px",
    },
    media: [
      {
        kind: "image",
        src: "/projects/bon-accueil/accueil.jpg",
        alt: "Entrée de l'hôtel Bon Accueil, maison jaune entourée de verdure",
      },
      {
        kind: "image",
        src: "/projects/bon-accueil/facade.jpg",
        alt: "Façade de l'hôtel Bon Accueil",
      },
      {
        kind: "image",
        src: "/projects/bon-accueil/deluxe.jpg",
        alt: "Chambre de l'hôtel Bon Accueil",
      },
      {
        kind: "image",
        src: "/projects/bon-accueil/suite.jpg",
        alt: "Suite de l'hôtel Bon Accueil",
      },
      {
        kind: "image",
        src: "/projects/bon-accueil/piscine.jpg",
        alt: "Piscine de l'hôtel Bon Accueil",
      },
      {
        kind: "image",
        src: "/projects/bon-accueil/jardin.jpg",
        alt: "Jardin de l'hôtel Bon Accueil",
      },
    ],
  },
  {
    slug: "jd-satisfaction-services-plus",
    name: "JD Satisfaction Services Plus",
    summary:
      "Plateforme web pour une entreprise de services et de vente de produits : catalogue, commandes, administration et livraison.",
    overview:
      "JD Satisfaction Services Plus est une réalisation pour une entreprise qui vend des services et des produits. La plateforme expose un catalogue et donne à l'entreprise un espace pour suivre les commandes.",
    problem:
      "Présenter une offre de services et de produits, puis permettre de commander et de suivre la livraison depuis un même outil.",
    solution:
      "Un site catalogue organisé par catégories, complété par un espace administrateur, un paiement semi-automatique et le suivi de la livraison.",
    features: [
      "Catalogue",
      "Catégories",
      "Produits",
      "Gestion des commandes",
      "Espace administrateur",
      "Paiement semi-automatique",
      "Gestion de livraison",
    ],
    technologies: ["Next.js", "React", "Tailwind CSS", "Supabase"],
    challenges: [
      "Organiser un catalogue qui mélange services et produits sans perdre le visiteur.",
      "Prévoir un espace administrateur distinct du site public.",
      "Relier la commande, le paiement semi-automatique et la livraison dans un flux compréhensible.",
    ],
    result:
      "La plateforme est en ligne et sert de vitrine commerciale autant que d'outil de suivi des commandes.",
    status: "En ligne",
    categories: ["Web", "E-commerce", "Client Projects"],
    liveUrl: "https://jd-satifaction-services-plus.vercel.app",
    image: "/projects/jd-satisfaction/logo.jpeg",
    imageAlt: "Logo JD Satisfaction Services Plus, bleu sur fond clair",
    theme: {
      bg: "#ffffff",
      surface: "#ffffff",
      ink: "#1a1a2e",
      muted: "#4b5563",
      accent: "#1a3a6b",
      accentInk: "#ffffff",
      line: "#e5e7eb",
      radius: "4px",
      buttonRadius: "4px",
    },
    media: [
      {
        kind: "image",
        src: "/projects/jd-satisfaction/logo.jpeg",
        alt: "Logo JD Satisfaction Services Plus",
      },
    ],
  },
  {
    slug: "prt-esport",
    name: "PRT E-sport",
    summary:
      "Plateforme orientée e-sport et communauté gaming : profils, publications, abonnements, messagerie et compétitions.",
    overview:
      "PRT E-sport est une plateforme communautaire autour du jeu et de l'e-sport. Elle permet de tenir un profil, de publier, d'échanger et de suivre des compétitions.",
    problem:
      "Donner à une communauté gaming un espace à elle, plutôt qu'une simple page de présentation.",
    solution:
      "Une application avec profils, publications, abonnements, messagerie et un espace dédié aux compétitions.",
    features: [
      "Profils",
      "Publications",
      "Abonnements",
      "Messagerie",
      "Communauté gaming",
      "Compétitions",
    ],
    technologies: ["Next.js", "React", "Supabase", "TypeScript"],
    challenges: [
      "Faire cohabiter contenu public, relations entre membres et messages privés.",
      "Structurer les profils et les publications pour qu'une communauté puisse s'en servir au quotidien.",
      "Prévoir les compétitions comme une partie du produit, pas comme une page isolée.",
    ],
    result:
      "La plateforme est en ligne et couvre les parcours communautaires prévus : profils, échanges et compétitions.",
    status: "En ligne",
    categories: ["Web", "Gaming"],
    liveUrl: "https://prt-tygee.vercel.app",
    image: "/projects/prt-esport/accueil.jpg",
    imageAlt: "Salle de jeu avec postes éclairés en bleu et rouge",
    theme: {
      bg: "#070b14",
      surface: "#0f1729",
      ink: "#f4f7ff",
      muted: "#9fb0c9",
      accent: "#00f0ff",
      accentInk: "#070b14",
      line: "rgba(0, 240, 255, 0.28)",
      radius: "12px",
      buttonRadius: "12px",
    },
    media: [
      {
        kind: "image",
        src: "/projects/prt-esport/accueil.jpg",
        alt: "Salle e-sport avec écrans et sièges gaming",
      },
      {
        kind: "image",
        src: "/projects/prt-esport/logo.jpg",
        alt: "Logo PRT E-sport",
      },
      {
        kind: "image",
        src: "/projects/prt-esport/free-fire.jpg",
        alt: "Visuel Free Fire utilisé sur PRT E-sport",
      },
      {
        kind: "image",
        src: "/projects/prt-esport/efootball.jpg",
        alt: "Visuel eFootball utilisé sur PRT E-sport",
      },
      {
        kind: "image",
        src: "/projects/prt-esport/fc-mobile.jpg",
        alt: "Visuel FC Mobile utilisé sur PRT E-sport",
      },
      {
        kind: "image",
        src: "/projects/prt-esport/call-of-duty.jpg",
        alt: "Visuel Call of Duty utilisé sur PRT E-sport",
      },
      {
        kind: "video",
        src: "/projects/prt-esport/hero.mp4",
        poster: "/projects/prt-esport/accueil.jpg",
        alt: "Vidéo d'accueil de PRT E-sport",
      },
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
