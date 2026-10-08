"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { profile } from "@/data/profile";

const OPEN_MS = 2600;
const TRANSITION_MS = 900;
const STORAGE_KEY = "ty-opened";

const description = "TY Space est un réseau social pour publier des twits, des photos, des vidéos courtes et des articles.";

export function SiteIntro() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [mode, setMode] = useState<"open" | "transition">("open");
  const [tick, setTick] = useState(0);
  const firstPath = useRef(true);
  const hideTimer = useRef<number | null>(null);

  function hideAfter(duration: number) {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* Le navigateur peut refuser le stockage. L'écran se ferme quand même. */
      }
    }, duration);
  }

  useEffect(() => {
    let opened = false;
    try {
      opened = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      opened = false;
    }
    setMode(opened ? "transition" : "open");
    hideAfter(opened ? TRANSITION_MS : OPEN_MS);

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link || link.target === "_blank") return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let next: URL;
      try {
        next = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (next.origin !== window.location.origin || next.pathname === window.location.pathname) return;
      setMode("transition");
      setTick((value) => value + 1);
      setVisible(true);
      hideAfter(TRANSITION_MS);
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    setMode("transition");
    setTick((value) => value + 1);
    setVisible(true);
    hideAfter(TRANSITION_MS);
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function leave() {
      setVisible(false);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* Le stockage n'est pas indispensable pour fermer l'écran. */
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") leave();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="intro" role="status" aria-live="polite" aria-label="TY Space">
      <div className="grid justify-items-center px-6 text-center">
        <span className="mark grid h-16 w-16 place-items-center font-mono text-lg font-bold text-white">TY</span>
        <p className="mt-5 text-3xl font-bold tracking-tight">TY Space</p>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">{description}</p>
        <p className="mt-6 text-sm font-semibold">Développé par {profile.name}</p>
      </div>
      <div className={`intro-bar ${mode === "transition" ? "is-short" : ""}`} aria-hidden="true">
        <span key={`${mode}-${tick}`} />
      </div>
    </div>
  );
}
