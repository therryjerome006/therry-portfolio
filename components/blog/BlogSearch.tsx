"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function BlogSearch({
  initial = "",
  basePath = "/blog",
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
      params.delete("page");
      const next = params.toString();
      const target = next ? `${basePath}?${next}` : basePath;
      if (`${window.location.pathname}${window.location.search}` !== target) {
        router.replace(target);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [basePath, router, value]);

  return (
    <form role="search" onSubmit={(event) => event.preventDefault()}>
      <label htmlFor="blog-search" className="sr-only">
        Rechercher un article
      </label>
      <input
        id="blog-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Rechercher un titre, un sujet, une catégorie…"
        className="field"
      />
    </form>
  );
}
