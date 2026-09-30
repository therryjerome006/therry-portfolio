import type { MetadataRoute } from "next";
import { projects } from "@/data/projects";
import { getPublishedPosts } from "@/lib/blog/posts";
import { listMedia } from "@/lib/media/db";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const posts = await getPublishedPosts();
  const media = await listMedia({ publishedOnly: true });

  return [
    { url: site, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${site}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${site}/media`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${site}/realisations`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${site}/cv`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    ...projects.map((project) => ({
      url: `${site}/projects/${project.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...media.map((item) => ({
      url: `${site}/media/${item.slug}`,
      lastModified: new Date(item.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${site}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
