function embed(url: string, kind: string) {
  try {
    const parsed = new URL(url);
    if (kind === "youtube") {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : "";
    }
    if (kind === "vimeo") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

export function VideoPlayer({
  url,
  kind,
  poster,
  title,
}: {
  url: string;
  kind: string;
  poster?: string;
  title: string;
}) {
  const frame = embed(url, kind);
  if (frame) {
    return (
      <iframe
        src={frame}
        title={title}
        className="aspect-video w-full bg-black"
        allow="fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <video
      controls
      playsInline
      preload="metadata"
      poster={poster || undefined}
      className="aspect-video w-full bg-black"
      aria-label={title}
    >
      <source src={url} />
    </video>
  );
}
