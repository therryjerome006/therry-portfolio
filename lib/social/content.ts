export const contentTypes = ["article", "post", "project", "media", "feed", "comment"] as const;

export type ContentType = (typeof contentTypes)[number];

export const COMMENT_PAGE = 20;

export function isContentType(value: string): value is ContentType {
  return contentTypes.includes(value as ContentType);
}

export function isContentId(value: string) {
  return /^[A-Za-z0-9-]{1,80}$/.test(value);
}

export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\") || value.includes("://") || value.includes("\0")) return "/";
  return value;
}
