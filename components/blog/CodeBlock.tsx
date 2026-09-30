"use client";

import { useState } from "react";

export function CodeBlock({
  code,
  language,
  html,
}: {
  code: string;
  language: string;
  html: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="code-block term">
      <div className="code-toolbar">
        <span className="inline-flex items-center gap-2">
          <span className="term-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          {language}
        </span>
        <button
          type="button"
          className="text-[#d7e2f0]"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      <ul className="term-menu" aria-hidden="true">
        <li className="is-active">
          <span className="term-ghost">compléter avec {language}</span>
          <span>Tab</span>
        </li>
      </ul>
    </div>
  );
}
