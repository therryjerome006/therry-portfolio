"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProjectMedia, ProjectTheme } from "@/data/projects";

export function ProjectGallery({ media, theme }: { media: ProjectMedia[]; theme: ProjectTheme }) {
  const [active, setActive] = useState(0);
  const item = media[active] ?? media[0];
  if (!item) return null;

  return (
    <div className="mt-8">
      <div
        className="overflow-hidden border"
        style={{ background: theme.bg, borderColor: theme.line, borderRadius: theme.radius }}
      >
        {item.kind === "video" ? (
          <video
            key={item.src}
            controls
            playsInline
            preload="metadata"
            poster={item.poster}
            className="aspect-video w-full bg-black object-contain"
            aria-label={item.alt}
          >
            <source src={item.src} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={item.src}
            alt={item.alt}
            width={1400}
            height={900}
            priority
            className="aspect-video w-full object-contain"
            style={{ background: theme.bg }}
          />
        )}
      </div>
      {media.length > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photos et vidéos du projet">
          {media.map((entry, index) => {
            const selected = index === active;
            const thumb = entry.kind === "video" ? entry.poster : entry.src;
            return (
              <li key={`${entry.src}-${index}`} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={entry.kind === "video" ? `Lire : ${entry.alt}` : entry.alt}
                  onClick={() => setActive(index)}
                  className="relative block h-16 w-24 overflow-hidden border"
                  style={{
                    borderColor: selected ? theme.accent : theme.line,
                    borderRadius: theme.radius === "999px" ? "12px" : theme.radius,
                  }}
                >
                  <Image src={thumb} alt="" width={160} height={100} className="h-full w-full object-cover" />
                  {entry.kind === "video" ? (
                    <span
                      className="absolute right-1 bottom-1 px-1 text-[10px] font-medium"
                      style={{ background: theme.accent, color: theme.accentInk }}
                    >
                      Vidéo
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
