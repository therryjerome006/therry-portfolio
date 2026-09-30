"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ActivityItem } from "@/lib/activities/db";

export function PhotoStrip({ items }: { items: ActivityItem[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = items.length > 1;

  function go(next: number) {
    const bounded = Math.min(Math.max(next, 0), items.length - 1);
    const node = scroller.current;
    if (!node) return;
    node.scrollTo({ left: bounded * node.clientWidth, behavior: "smooth" });
    setIndex(bounded);
  }

  return (
    <div className="relative bg-black">
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        aria-label="Photos de la publication"
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth;
          if (!width) return;
          setIndex(Math.round(event.currentTarget.scrollLeft / width));
        }}
      >
        {items.map((item, itemIndex) => (
          <div key={item.id || item.url} className="w-full shrink-0 snap-start">
            {item.kind === "video" ? (
              <video controls playsInline preload="metadata" className="aspect-[4/5] w-full bg-black object-contain">
                <source src={item.url} type={item.url.endsWith(".webm") ? "video/webm" : "video/mp4"} />
              </video>
            ) : (
              <div className="relative aspect-[4/5]">
                <Image
                  src={item.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 32rem"
                />
                <span className="sr-only">Photo {itemIndex + 1}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {many ? (
        <>
          <button
            type="button"
            className="absolute top-1/2 left-2 grid h-9 w-9 -translate-y-1/2 place-items-center bg-white text-lg font-bold text-ink disabled:opacity-40"
            aria-label="Photo précédente"
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center bg-white text-lg font-bold text-ink disabled:opacity-40"
            aria-label="Photo suivante"
            disabled={index === items.length - 1}
            onClick={() => go(index + 1)}
          >
            ›
          </button>
          <p className="absolute right-3 bottom-3 bg-black/70 px-2 py-1 text-xs font-semibold text-white">
            {index + 1} / {items.length}
          </p>
        </>
      ) : null}
    </div>
  );
}
