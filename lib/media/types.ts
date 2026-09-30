import type { MediaType } from "@/lib/media/constants";

export type MediaItemKind = "image" | "video" | "youtube" | "vimeo";

export type MediaItem = {
  id: string;
  postId: string;
  kind: MediaItemKind;
  url: string;
  thumbnailUrl: string;
  alt: string;
  caption: string;
  sortOrder: number;
  fileName: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  mimeType: string;
  bucket: string;
  storagePath: string;
  createdAt: string;
};

export type MediaPost = {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: MediaType;
  category: string;
  tags: string[];
  status: "draft" | "published";
  articlePath: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  items: MediaItem[];
};

export type MediaDraftItem = {
  kind: MediaItemKind;
  url: string;
  thumbnailUrl: string;
  alt: string;
  caption: string;
  fileName: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  mimeType: string;
  bucket: string;
  storagePath: string;
};
