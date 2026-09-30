export function formatBytes(size: number | null) {
  if (size == null || !Number.isFinite(size)) return "";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatDuration(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function mediaCounts(items: { kind: string }[]) {
  const photos = items.filter((item) => item.kind === "image").length;
  const videos = items.filter((item) => item.kind !== "image").length;
  return { photos, videos };
}

export function coverOf(items: { kind: string; url: string; thumbnailUrl: string }[]) {
  const image = items.find((item) => item.kind === "image");
  if (image) return image.url;
  const poster = items.find((item) => item.thumbnailUrl);
  return poster?.thumbnailUrl ?? "";
}
