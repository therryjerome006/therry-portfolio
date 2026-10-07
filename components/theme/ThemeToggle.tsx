"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ty-theme", next);
    setTheme(next);
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="grid h-10 w-10 place-items-center text-ink"
      aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
      aria-pressed={dark}
      onClick={toggle}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
