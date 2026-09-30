export const mediaTypes = ["photo", "video", "gallery", "mixed", "update"] as const;

export type MediaType = (typeof mediaTypes)[number];

export const mediaTypeLabels: Record<MediaType, string> = {
  photo: "Photo",
  video: "Vidéo",
  gallery: "Galerie",
  mixed: "Mixte",
  update: "Mise à jour",
};

export const mediaCategories = [
  "Projects",
  "Development",
  "Behind the Scenes",
  "Tutorials",
  "Events",
  "Gaming",
  "Technology",
  "Personal",
  "Updates",
] as const;

export type MediaCategory = (typeof mediaCategories)[number];

export const mediaFilters = [
  { id: "all", label: "All" },
  { id: "photo", label: "Photos" },
  { id: "video", label: "Videos" },
  { id: "gallery", label: "Galleries" },
  { id: "Projects", label: "Projects" },
  { id: "Development", label: "Development" },
  { id: "Gaming", label: "Gaming" },
  { id: "Technology", label: "Technology" },
] as const;

export const imageExtensions = ["jpg", "jpeg", "png", "webp", "avif"] as const;
export const videoExtensions = ["mp4", "webm"] as const;

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 80 * 1024 * 1024;
export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

export const mediaBuckets = {
  image: "media-images",
  video: "media-videos",
  thumbnail: "media-thumbnails",
} as const;

export type UploadKind = keyof typeof mediaBuckets;
