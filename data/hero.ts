/**
 * Visuels des quatre cartes de l'accueil.
 * Photo : kind "image" et src "/hero/ma-photo.jpg"
 * Vidéo : kind "video", src "/hero/ma-video.mp4", poster "/hero/apercu.jpg"
 */
export type HeroCard = {
  tech: string;
  color: string;
  ink: string;
  frame: string;
  note: string;
  media:
    | { kind: "image"; src: string; alt: string }
    | { kind: "video"; src: string; poster: string; alt: string };
};

export const heroCards: HeroCard[] = [
  {
    tech: "Next.js",
    color: "#111111",
    ink: "#ffffff",
    frame: "#000000",
    note: "",
    media: {
      kind: "image",
      src: "/hero/nextjs.jpg",
      alt: "Logo Next.js",
    },
  },
  {
    tech: "React",
    color: "#087ea4",
    ink: "#ffffff",
    frame: "#07147c",
    note: "",
    media: {
      kind: "image",
      src: "/hero/react.jpg",
      alt: "Logo React",
    },
  },
  {
    tech: "TypeScript",
    color: "#3178c6",
    ink: "#ffffff",
    frame: "#3178c6",
    note: "",
    media: {
      kind: "image",
      src: "/hero/typescript.png",
      alt: "Logo TypeScript",
    },
  },
  {
    tech: "Supabase",
    color: "#3ecf8e",
    ink: "#052e16",
    frame: "#ffffff",
    note: "",
    media: {
      kind: "image",
      src: "/hero/supabase.png",
      alt: "Logo Supabase",
    },
  },
];
