import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from "@/lib/network/constants";

const buckets = {
  image: "post-images",
  video: "post-videos",
  article: "article-images",
} as const;

type NetworkBucket = (typeof buckets)[keyof typeof buckets];

function config() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  return { base, key };
}

export function imageKind(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

export function isMp4(buffer: Buffer) {
  return buffer.length > 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
}

export function mp4DurationSeconds(buffer: Buffer) {
  const marker = Buffer.from("mvhd");
  const index = buffer.indexOf(marker);
  if (index < 0 || index + 24 > buffer.length) return null;
  const version = buffer[index + 4];
  if (version === 0) {
    const timescale = buffer.readUInt32BE(index + 16);
    const duration = buffer.readUInt32BE(index + 20);
    if (!timescale) return null;
    return duration / timescale;
  }
  if (version === 1 && index + 40 <= buffer.length) {
    const timescale = buffer.readUInt32BE(index + 28);
    const duration = Number(buffer.readBigUInt64BE(index + 32));
    if (!timescale) return null;
    return duration / timescale;
  }
  return null;
}

export function extensionFor(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  return "";
}

export async function uploadNetworkFile(bucket: NetworkBucket, path: string, body: Buffer, mime: string) {
  const { base, key } = config();
  if (!base || !key) throw new Error("Ajoutez SUPABASE_SECRET_KEY pour envoyer des fichiers.");
  if (!/^[a-z0-9/_-]+\.[a-z0-9]+$/i.test(path)) throw new Error("Chemin de fichier invalide.");
  const response = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      apikey: key,
      "content-type": mime,
      "cache-control": "public, max-age=31536000",
      "x-upsert": "false",
    },
    body: new Uint8Array(body),
  });
  if (!response.ok) throw new Error("L'envoi vers le stockage a échoué.");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export async function deleteNetworkFile(url: string) {
  const { base, key } = config();
  if (!base || !key) return;
  const prefix = `${base}/storage/v1/object/public/`;
  if (!url.startsWith(prefix)) return;
  const rest = url.slice(prefix.length);
  const slash = rest.indexOf("/");
  if (slash <= 0) return;
  const bucket = rest.slice(0, slash);
  const path = decodeURIComponent(rest.slice(slash + 1));
  if (!Object.values(buckets).includes(bucket as NetworkBucket)) return;
  if (!/^[a-z0-9/_-]+\.[a-z0-9]+$/i.test(path)) return;
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

export async function readImage(file: File) {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return { error: "La photo doit faire moins de 8 Mo." } as const;
  const body = Buffer.from(await file.arrayBuffer());
  const mime = imageKind(body);
  if (!mime) return { error: "Utilisez une photo JPEG, PNG ou WebP." } as const;
  return { body, mime, extension: extensionFor(mime) } as const;
}

export async function readVideo(file: File) {
  if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) return { error: "La vidéo doit faire moins de 25 Mo." } as const;
  const body = Buffer.from(await file.arrayBuffer());
  if (!isMp4(body)) return { error: "Utilisez une vidéo MP4." } as const;
  const duration = mp4DurationSeconds(body);
  if (duration == null) return { error: "La durée de cette vidéo n'a pas pu être vérifiée." } as const;
  if (duration > MAX_VIDEO_SECONDS) return { error: "Cette vidéo dépasse la durée maximale de 15 secondes." } as const;
  return { body, mime: "video/mp4", extension: "mp4", duration } as const;
}

export { buckets };
