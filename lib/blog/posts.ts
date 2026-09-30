import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
import { cache } from "react";
import { BLOG_PAGE_SIZE, blogCategories, type BlogCategory } from "@/data/blog";
import type { BlogPost, BlogQuery, PostStatus } from "@/lib/blog/types";

const postsDirectory = path.join(process.cwd(), "content", "blog");
const coversDirectory = path.join(process.cwd(), "public", "blog", "covers");

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function asStatus(value: unknown): PostStatus {
  return value === "published" ? "published" : "draft";
}

function asCategory(value: unknown): BlogCategory | null {
  const category = asString(value);
  return blogCategories.includes(category as BlogCategory)
    ? (category as BlogCategory)
    : null;
}

function toIso(value: unknown, fallback: string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return fallback;
}

function parsePost(fileSlug: string, raw: string): BlogPost | null {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const category = asCategory(data.category);
  const title = asString(data.title);
  const slug = asString(data.slug) || fileSlug;
  if (!title || !category || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;

  const createdAt = toIso(data.createdAt ?? data.created_at, new Date(0).toISOString());
  const status = asStatus(data.status);

  return {
    slug,
    title,
    excerpt: asString(data.excerpt),
    content: parsed.content.trim(),
    coverImage: asString(data.coverImage ?? data.cover_image),
    category,
    tags: asTags(data.tags),
    status,
    publishedAt:
      status === "published"
        ? toIso(data.publishedAt ?? data.published_at, createdAt)
        : data.publishedAt
          ? toIso(data.publishedAt, createdAt)
          : null,
    createdAt,
    updatedAt: toIso(data.updatedAt ?? data.updated_at, createdAt),
    demo: data.demo === true,
    featured: data.featured === true,
  };
}

export const getAllPosts = cache(async () => {
  let files: string[] = [];
  try {
    files = await fs.readdir(postsDirectory);
  } catch {
    return [];
  }

  const posts = await Promise.all(
    files
      .filter((file) => file.endsWith(".md"))
      .map(async (file) => {
        const raw = await fs.readFile(path.join(postsDirectory, file), "utf8");
        return parsePost(file.replace(/\.md$/, ""), raw);
      }),
  );

  return posts
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => {
      const aDate = a.publishedAt ?? a.createdAt;
      const bDate = b.publishedAt ?? b.createdAt;
      return bDate.localeCompare(aDate);
    });
});

export async function getPublishedPosts() {
  const posts = await getAllPosts();
  return posts.filter((post) => post.status === "published");
}

export async function getPostBySlug(slug: string, includeDrafts = false) {
  const posts = includeDrafts ? await getAllPosts() : await getPublishedPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export function readingMinutes(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function filterPosts(posts: BlogPost[], query: BlogQuery) {
  const q = query.q?.trim().toLowerCase();
  return posts.filter((post) => {
    if (query.category && post.category !== query.category) return false;
    if (query.tag && !post.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) {
      return false;
    }
    if (!q) return true;
    const haystack = [post.title, post.excerpt, post.content, post.category, ...post.tags]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function paginatePosts<T>(items: T[], page = 1, pageSize = BLOG_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
    total: items.length,
  };
}

export async function getFeaturedPost(posts: BlogPost[]) {
  return posts.find((post) => post.featured) ?? posts[0] ?? null;
}

export async function getRelatedPosts(post: BlogPost, limit = 3) {
  const posts = await getPublishedPosts();
  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
      const sameCategory = candidate.category === post.category ? 2 : 0;
      return { candidate, score: sharedTags + sameCategory };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.candidate);
}

export async function getAdjacentPosts(slug: string) {
  const posts = await getPublishedPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: posts[index + 1] ?? null,
    next: posts[index - 1] ?? null,
  };
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function isSafeAssetUrl(value: string) {
  if (!value) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

type SaveInput = {
  originalSlug: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: BlogCategory;
  tags: string[];
  status: PostStatus;
  publishedAt: string | null;
  demo: boolean;
  featured: boolean;
};

export async function writePost(input: SaveInput) {
  await fs.mkdir(postsDirectory, { recursive: true });
  const now = new Date().toISOString();
  const previous = input.originalSlug
    ? await readRawPost(input.originalSlug)
    : null;
  const createdAt = previous?.createdAt ?? now;
  const publishedAt =
    input.status === "published" ? input.publishedAt || previous?.publishedAt || now : input.publishedAt;

  const markdown = matter.stringify(input.content.trim() + "\n", {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    coverImage: input.coverImage,
    category: input.category,
    tags: input.tags,
    status: input.status,
    publishedAt,
    createdAt,
    updatedAt: now,
    demo: input.demo,
    featured: input.featured,
  });

  if (input.originalSlug && input.originalSlug !== input.slug) {
    await fs.rm(path.join(postsDirectory, `${input.originalSlug}.md`), { force: true });
  }

  await fs.writeFile(path.join(postsDirectory, `${input.slug}.md`), markdown, "utf8");
}

async function readRawPost(slug: string) {
  if (!isValidSlug(slug)) return null;
  try {
    const raw = await fs.readFile(path.join(postsDirectory, `${slug}.md`), "utf8");
    return parsePost(slug, raw);
  } catch {
    return null;
  }
}

export async function deletePostFile(slug: string) {
  if (!isValidSlug(slug)) return;
  await fs.rm(path.join(postsDirectory, `${slug}.md`), { force: true });
}

const imageTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export async function saveCoverFile(file: File, slug: string) {
  const extension = imageTypes[file.type];
  if (!extension) throw new Error("Format d'image non pris en charge.");
  if (file.size > 2_000_000) throw new Error("Image trop lourde (2 Mo maximum).");

  await fs.mkdir(coversDirectory, { recursive: true });
  const filename = `${slug}-${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(coversDirectory, filename), buffer);
  return `/blog/covers/${filename}`;
}
