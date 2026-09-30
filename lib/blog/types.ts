import type { BlogCategory } from "@/data/blog";

export type PostStatus = "draft" | "published";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: BlogCategory;
  tags: string[];
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
  featured: boolean;
};

export type BlogQuery = {
  q?: string;
  category?: string;
  tag?: string;
  page?: number;
};
