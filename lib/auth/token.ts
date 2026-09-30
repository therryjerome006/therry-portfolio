export const SESSION_COOKIE = "tj_admin";

const encoder = new TextEncoder();

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function adminSecretConfigured() {
  return getSecret().length > 0;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createSessionToken(maxAgeSeconds = 60 * 60 * 24 * 7) {
  const secret = getSecret();
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = `v2.${expiresAt}`;
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

export async function signPath(pathname: string) {
  const secret = getSecret();
  if (!secret || !pathname.startsWith("/admin")) return "";
  return sign(`path.${pathname}`, secret);
}

export async function pathSignatureMatches(pathname: string, signature: string | null) {
  if (!pathname || !signature) return false;
  const expected = await signPath(pathname);
  if (!expected) return false;
  return safeEqual(expected, signature);
}

export function safeAdminNext(value: string | undefined) {
  if (!value || value === "/admin") return "/admin/blog";
  if (!value.startsWith("/admin/")) return "/admin/blog";
  if (value.startsWith("/admin/login")) return "/admin/blog";
  if (value.includes("\\") || value.includes("//") || value.includes("://") || value.includes("\0")) {
    return "/admin/blog";
  }
  return value;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const [version, expires, signature] = token.split(".");
  if (version !== "v2" || !expires || !signature) return false;
  const payload = `${version}.${expires}`;

  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() / 1000) return false;

  const expected = await sign(payload, secret);
  return safeEqual(expected, signature);
}

export function passwordsMatch(input: string, expected: string) {
  return safeEqual(input, expected);
}
