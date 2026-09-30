"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function MediaSearch({
  initial = "",
  basePath = "/media",
}: {
  initial?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      const next = params.toString();
      const target = next ? `${basePath}?${next}` : basePath;
      if (`${window.location.pathname}${window.location.search}` !== target) router.replace(target);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [basePath, router, value]);

  return (
    <form role="search" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="media-search" className="sr-only">
        Rechercher dans le journal
      </label>
      <input
        id="media-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Rechercher un titre, une description, une catégorie, un tag…"
        className="field"
      />
    </form>
  );
}
