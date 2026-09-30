import { mediaBuckets, type UploadKind } from "@/lib/media/constants";

function config() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  return { base, key };
}

export function publicObjectUrl(bucket: string, path: string) {
  const { base } = config();
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function storageRef(url: string) {
  const { base } = config();
  const prefix = `${base}/storage/v1/object/public/`;
  if (!base || !url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash);
  const path = decodeURIComponent(rest.slice(slash + 1));
  if (!Object.values(mediaBuckets).includes(bucket as (typeof mediaBuckets)[UploadKind])) return null;
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(path)) return null;
  return { bucket, path };
}

export function isOwnStorageUrl(url: string) {
  return storageRef(url) !== null;
}

export async function uploadObject(kind: UploadKind, path: string, body: Buffer, mime: string) {
  const { base, key } = config();
  if (!base || !key) throw new Error("Ajoutez SUPABASE_SECRET_KEY pour envoyer des fichiers.");
  const bucket = mediaBuckets[kind];
  const response = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      "content-type": mime,
      "cache-control": "public, max-age=31536000",
      "x-upsert": "true",
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) {
    throw new Error("L'envoi vers le stockage a échoué.");
  }
  return { bucket, path, url: publicObjectUrl(bucket, path) };
}

export async function deleteObject(bucket: string, path: string) {
  const { base, key } = config();
  if (!base || !key || !bucket || !path) return;
  if (!Object.values(mediaBuckets).includes(bucket as (typeof mediaBuckets)[UploadKind])) return;
  if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(path)) return;
  await fetch(`${base}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
  });
}
