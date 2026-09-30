import {
  IMAGE_MAX_BYTES,
  THUMBNAIL_MAX_BYTES,
  VIDEO_MAX_BYTES,
  type UploadKind,
} from "@/lib/media/constants";

export type DetectedFile = {
  mime: string;
  extension: "jpg" | "png" | "webp" | "avif" | "mp4" | "webm";
  kind: "image" | "video";
};

function ascii(bytes: Uint8Array, start: number, end: number) {
  let value = "";
  for (let index = start; index < end && index < bytes.length; index += 1) {
    value += String.fromCharCode(bytes[index] ?? 0);
  }
  return value;
}

export function detectMedia(bytes: Uint8Array): DetectedFile | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg", kind: "image" };
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") {
    return { mime: "image/png", extension: "png", kind: "image" };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return { mime: "image/webp", extension: "webp", kind: "image" };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (brand === "avif" || brand === "avis") {
      return { mime: "image/avif", extension: "avif", kind: "image" };
    }
    if (brand === "heic" || brand === "heix" || brand === "mif1" || brand === "msf1") return null;
    return { mime: "video/mp4", extension: "mp4", kind: "video" };
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { mime: "video/webm", extension: "webm", kind: "video" };
  }
  return null;
}

export function limitFor(kind: UploadKind) {
  if (kind === "video") return VIDEO_MAX_BYTES;
  if (kind === "thumbnail") return THUMBNAIL_MAX_BYTES;
  return IMAGE_MAX_BYTES;
}

export function validateUpload(bytes: Uint8Array, kind: UploadKind, size = bytes.byteLength): DetectedFile | string {
  const detected = detectMedia(bytes);
  if (!detected) return "Format non reconnu. Utilisez JPG, PNG, WebP, AVIF, MP4 ou WebM.";
  if (kind === "video" && detected.kind !== "video") return "Ce fichier n'est pas une vidéo MP4 ou WebM.";
  if (kind !== "video" && detected.kind !== "image") return "Ce fichier n'est pas une image acceptée.";
  if (size > limitFor(kind)) {
    const max = Math.round(limitFor(kind) / (1024 * 1024));
    return `Fichier trop lourd. Maximum ${max} Mo.`;
  }
  return detected;
}
