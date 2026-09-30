"use client";

import { useState } from "react";

export function ArticleShare({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${encoded}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}` },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="btn btn-line h-10 min-h-0 px-3">
          {link.label}
        </a>
      ))}
      <button
        type="button"
        className="btn btn-line h-10 min-h-0 px-3"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? "Lien copié" : "Copier le lien"}
      </button>
    </div>
  );
}
