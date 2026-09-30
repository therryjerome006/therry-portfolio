export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return value || "http://localhost:3000";
}
