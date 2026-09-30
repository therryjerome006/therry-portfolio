export type SkillGroup = {
  title: string;
  note: string;
  items: string[];
};

export const skillTones: Record<string, { background: string; color: string }> = {
  HTML: { background: "#e44d26", color: "#ffffff" },
  CSS: { background: "#1572b6", color: "#ffffff" },
  JavaScript: { background: "#f7df1e", color: "#111111" },
  TypeScript: { background: "#3178c6", color: "#ffffff" },
  React: { background: "#087ea4", color: "#ffffff" },
  "Next.js": { background: "#111111", color: "#ffffff" },
  "Tailwind CSS": { background: "#06b6d4", color: "#042f2e" },
  Bootstrap: { background: "#7952b3", color: "#ffffff" },
  "Node.js": { background: "#339933", color: "#ffffff" },
  Supabase: { background: "#3ecf8e", color: "#052e16" },
  PostgreSQL: { background: "#336791", color: "#ffffff" },
  APIs: { background: "#1d6fe8", color: "#ffffff" },
  Authentication: { background: "#12263f", color: "#ffffff" },
  Git: { background: "#f05033", color: "#ffffff" },
  GitHub: { background: "#24292f", color: "#ffffff" },
  "VS Code": { background: "#007acc", color: "#ffffff" },
  Vercel: { background: "#111111", color: "#ffffff" },
  npm: { background: "#cb3837", color: "#ffffff" },
  Cybersecurity: { background: "#0f766e", color: "#ffffff" },
  "Artificial Intelligence": { background: "#7c3aed", color: "#ffffff" },
  "Software Engineering": { background: "#1d4ed8", color: "#ffffff" },
  "New Technologies": { background: "#0369a1", color: "#ffffff" },
};

export const skillGroups: SkillGroup[] = [
  {
    title: "Frontend",
    note: "En pratique",
    items: [
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Tailwind CSS",
      "Bootstrap",
    ],
  },
  {
    title: "Backend / Database",
    note: "En pratique",
    items: [
      "Next.js",
      "Node.js",
      "Supabase",
      "PostgreSQL",
      "APIs",
      "Authentication",
    ],
  },
  {
    title: "Tools",
    note: "En pratique",
    items: ["Git", "GitHub", "VS Code", "Vercel", "npm"],
  },
  {
    title: "Autres intérêts",
    note: "En exploration",
    items: [
      "Cybersecurity",
      "Artificial Intelligence",
      "Software Engineering",
      "New Technologies",
    ],
  },
];
