"use client";

import { useState } from "react";
import { MediaViewer } from "@/components/media/MediaViewer";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import type { MediaItem } from "@/lib/media/types";

export function MediaGallery({ items }: { items: MediaItem[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (items.length === 0) return null;
  const several = items.length > 1;

  return (
    <>
      <ul className={several ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
        {items.map((item, index) => (
          <li key={item.id} className={several && index === 0 ? "sm:col-span-2" : ""}>
            {item.kind === "image" ? (
              <button type="button" className="block w-full border border-line bg-white" onClick={() => setActive(index)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.alt || ""} className="aspect-[4/3] w-full object-cover" />
              </button>
            ) : (
              <div className="border border-line bg-black">
                <VideoPlayer url={item.url} kind={item.kind} poster={item.thumbnailUrl} title={item.alt || item.caption || "Vidéo"} />
              </div>
            )}
            {item.caption ? <p className="mt-2 text-sm text-muted">{item.caption}</p> : null}
          </li>
        ))}
      </ul>
      {active != null ? (
        <MediaViewer items={items} index={active} onClose={() => setActive(null)} onIndex={setActive} />
      ) : null}
    </>
  );
}
