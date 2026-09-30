"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { blogCategories, type BlogCategory } from "@/data/blog";
import { requireAdmin } from "@/lib/auth/session";
import {
  deletePostFile,
  getPostBySlug,
  isSafeAssetUrl,
  isValidSlug,
  saveCoverFile,
  writePost,
} from "@/lib/blog/posts";
import type { PostStatus } from "@/lib/blog/types";

export type PostFormState = { error?: string };

function tagsFrom(value: string) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 8);
}

export async function savePost(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  await requireAdmin();

  const originalSlug = String(formData.get("originalSlug") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  let coverImage = String(formData.get("coverImage") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const tags = tagsFrom(String(formData.get("tags") ?? ""));
  const status = (String(formData.get("status") ?? "draft") === "published"
    ? "published"
    : "draft") as PostStatus;
  const publishedAtInput = String(formData.get("publishedAt") ?? "").trim();
  let publishedAt: string | null = null;
  if (publishedAtInput) {
    const parsedDate = new Date(publishedAtInput);
    if (Number.isNaN(parsedDate.getTime())) return { error: "Date de publication invalide." };
    publishedAt = parsedDate.toISOString();
  }
  const demo = formData.get("demo") === "on";
  const featured = formData.get("featured") === "on";

  if (!title || !slug || !excerpt || !content || !category) {
    return { error: "Titre, slug, résumé, contenu et catégorie sont requis." };
  }
  if (!isValidSlug(slug)) {
    return { error: "Le slug doit être en minuscules, avec des tirets." };
  }
  if (!blogCategories.includes(category as BlogCategory)) {
    return { error: "Catégorie inconnue." };
  }
  if (!isSafeAssetUrl(coverImage)) {
    return { error: "L'adresse de l'image n'est pas valide." };
  }

  const existing = await getPostBySlug(slug, true);
  if (existing && slug !== originalSlug) {
    return { error: "Ce slug est déjà utilisé." };
  }

  const coverFile = formData.get("coverFile");
  if (coverFile instanceof File && coverFile.size > 0) {
    try {
      coverImage = await saveCoverFile(coverFile, slug);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Image refusée." };
    }
  }

  try {
    await writePost({
      originalSlug,
      title,
      slug,
      excerpt,
      content,
      coverImage,
      category: category as BlogCategory,
      tags,
      status,
      publishedAt,
      demo,
      featured,
    });
  } catch {
    return {
      error:
        "Impossible d'enregistrer le fichier. En production sur Vercel, le disque est en lecture seule : créez l'article en local, puis déployez.",
    };
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  if (originalSlug && originalSlug !== slug) revalidatePath(`/blog/${originalSlug}`);
  revalidatePath("/admin/blog");
  revalidatePath("/sitemap.xml");
  redirect(`/admin/blog/${slug}/edit?saved=1`);
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  if (!isValidSlug(slug)) redirect("/admin/blog");

  try {
    await deletePostFile(slug);
  } catch {
    redirect("/admin/blog?error=delete");
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/blog");
  redirect("/admin/blog");
}
