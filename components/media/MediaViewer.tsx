"use client";

import { useEffect, useState } from "react";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import type { MediaItem } from "@/lib/media/types";

export function MediaViewer({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const [zoom, setZoom] = useState(false);
  const item = items[index];

  useEffect(() => {
    setZoom(false);
  }, [index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (event.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;
  const image = item.kind === "image";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#071018]/95 text-white" role="dialog" aria-modal="true" aria-label={item.alt || item.caption || "Média"}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="font-mono text-sm">
          {index + 1} / {items.length}
        </p>
        <div className="flex gap-2">
          {image ? (
            <button type="button" className="btn btn-line h-10 min-h-0 border-white/30 px-3 text-white" onClick={() => setZoom((value) => !value)}>
              {zoom ? "Réduire" : "Zoom"}
            </button>
          ) : null}
          <button type="button" className="btn btn-line h-10 min-h-0 border-white/30 px-3 text-white" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-4">
        <button type="button" className="absolute top-0 left-0 h-full w-16 text-2xl" aria-label="Précédent" onClick={() => onIndex((index - 1 + items.length) % items.length)}>
          ‹
        </button>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt={item.alt || ""}
            className={`max-h-full max-w-full object-contain ${zoom ? "max-h-none scale-150" : ""}`}
          />
        ) : (
          <div className="w-full max-w-4xl">
            <VideoPlayer url={item.url} kind={item.kind} poster={item.thumbnailUrl} title={item.alt || item.caption || "Vidéo"} />
          </div>
        )}
        <button type="button" className="absolute top-0 right-0 h-full w-16 text-2xl" aria-label="Suivant" onClick={() => onIndex((index + 1) % items.length)}>
          ›
        </button>
      </div>
      {item.caption || item.alt ? <p className="px-6 py-4 text-center text-sm text-white/80">{item.caption || item.alt}</p> : null}
    </div>
  );
}
