const palettes: Record<string, [string, string, string, string]> = {
  graphisme: ["#6d3142", "#e7b15a", "#f6efe4", "#2a1c18"],
  programmation: ["#1f7a4d", "#d9f5c9", "#f2c14e", "#123528"],
  "marketing-digital": ["#e36b4a", "#ffe7c2", "#7d2e3b", "#fff8ef"],
  "video-anim": ["#3d2e8a", "#f3b3d8", "#ffd56a", "#1d163f"],
  ecriture: ["#f4efe6", "#243045", "#d98b4a", "#8ea0b5"],
  audio: ["#1d2430", "#f25c78", "#f7d36a", "#67d5c2"],
  business: ["#efe7dc", "#355c7d", "#e7b15a", "#222"],
  formation: ["#e8f6ef", "#1f7a4d", "#f2c14e", "#163828"],
  "photo-evenement": ["#d7e4ea", "#355c7d", "#f4efe6", "#c46b4a"],
  "services-locaux": ["#f6efe4", "#8c4a32", "#d7a15e", "#2f241c"],
  autres: ["#eef1f4", "#404145", "#1dbf73", "#222"],
};

export function CategoryArt({ slug, title }: { slug: string; title: string }) {
  const colors = palettes[slug] ?? palettes.autres;
  return (
    <span className="market-art" style={{ background: colors[0] }}>
      <svg viewBox="0 0 320 140" role="img" aria-label={title}>
        <rect width="320" height="140" fill={colors[0]} />
        <circle cx="250" cy="48" r="42" fill={colors[1]} />
        <rect x="28" y="28" width="92" height="72" rx="8" fill={colors[2]} />
        <path d="M150 96h78l-18-48h-42z" fill={colors[3]} />
        <rect x="186" y="78" width="108" height="14" rx="7" fill={colors[1]} opacity="0.9" />
      </svg>
    </span>
  );
}
