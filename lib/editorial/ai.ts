import { AI_BATCH_MAX, editorialCategories, type EditorialKind, type EditorialLanguage, type EditorialTone } from "@/lib/editorial/constants";
import { isExplicit } from "@/lib/network/safety";

export type GeneratedDraft = {
  kind: EditorialKind;
  title: string;
  body: string;
  discussion: string;
  category: string;
  profileSlug: string;
  note: string;
  language: EditorialLanguage;
};

export function aiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.EDITORIAL_AI_PROVIDER !== "off";
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function asKind(value: unknown, allowed: EditorialKind[]): EditorialKind {
  return allowed.includes(value as EditorialKind) ? (value as EditorialKind) : allowed[0] || "text";
}

export async function generateDrafts(input: {
  count: number;
  categories: string[];
  kinds: EditorialKind[];
  tone: EditorialTone;
  language: EditorialLanguage;
  audience: string;
  profileSlug: string;
  length: "courte" | "moyenne" | "article";
  avoid: string;
}) {
  const key = process.env.OPENAI_API_KEY;
  if (!aiConfigured() || !key) return { error: "Aucun fournisseur d'IA n'est configuré." } as const;
  const count = Math.min(AI_BATCH_MAX, Math.max(1, input.count));
  const kinds = input.kinds.length > 0 ? input.kinds : (["text"] as EditorialKind[]);
  const model = process.env.EDITORIAL_AI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(50_000),
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "Tu prépares des brouillons pour TY Space, un réseau pour les 12-22 ans.",
            "Réponds uniquement en JSON : {\"drafts\":[...]}.",
            "Chaque brouillon contient kind, title, body, discussion, category, profileSlug, mediaNote, language.",
            "Aucun faux témoignage, aucune citation attribuée à une personne réelle, aucune fausse actualité, aucun chiffre présenté comme un fait vérifié.",
            "Si un sujet dépend d'une source, écris dans mediaNote : À vérifier.",
            "Aucun contenu sexuel, aucune insulte, aucune donnée personnelle, aucune adresse, aucun numéro.",
            "N'invente pas d'expérience vécue par une personne réelle.",
            "Les textes et légendes font au plus 500 caractères. Un article fait entre 400 et 1200 caractères, avec un titre.",
            "discussion est une question ouverte, ou vide.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            count,
            categories: input.categories,
            kinds,
            tone: input.tone,
            language: input.language,
            audience: input.audience,
            profileSlug: input.profileSlug,
            length: input.length,
            avoid: input.avoid.slice(0, 280),
            profiles: editorialCategories.map((item) => item.id),
          }),
        },
      ],
    }),
  });
  if (!response.ok) return { error: "La génération a échoué. Les brouillons manuels restent disponibles." } as const;
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = payload.choices?.[0]?.message?.content || "";
  let parsed: { drafts?: unknown[] };
  try {
    parsed = JSON.parse(raw) as { drafts?: unknown[] };
  } catch {
    return { error: "La réponse de l'IA n'a pas pu être lue." } as const;
  }
  const drafts: GeneratedDraft[] = [];
  for (const entry of parsed.drafts ?? []) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const allowed = input.length === "article" ? (["article"] as EditorialKind[]) : kinds.filter((item) => item !== "article");
    const kind = asKind(row.kind, allowed.length > 0 ? allowed : ["text"]);
    const title = clip(row.title, 120);
    const bodyMax = kind === "article" ? 4000 : 500;
    const body = typeof row.body === "string" ? row.body.trim().slice(0, bodyMax) : "";
    const discussion = clip(row.discussion, 200);
    const text = `${title} ${body} ${discussion}`;
    if (!body || isExplicit(text)) continue;
    if (kind !== "article" && body.length > 500) continue;
    const noteParts = ["Brouillon généré, à relire avant publication."];
    const mediaNote = clip(row.mediaNote, 160);
    if (mediaNote) noteParts.push(mediaNote);
    if (/\d{4}|\d+ %|actualité|selon/i.test(body)) noteParts.push("À vérifier.");
    const slug = editorialCategories.some((item) => item.id === row.profileSlug) ? String(row.profileSlug) : input.profileSlug;
    drafts.push({
      kind,
      title: kind === "article" ? title : title.slice(0, 80),
      body,
      discussion,
      category: clip(row.category, 40) || input.categories[0] || "officiel",
      profileSlug: slug,
      note: noteParts.join(" ").slice(0, 280),
      language: input.language,
    });
    if (drafts.length >= count) break;
  }
  if (drafts.length === 0) return { error: "Aucun brouillon utilisable n'a été retenu." } as const;
  return { drafts } as const;
}
