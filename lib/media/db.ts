import { Pool, type QueryResultRow } from "pg";
import type { MediaDraftItem, MediaItem, MediaPost } from "@/lib/media/types";
import type { MediaType } from "@/lib/media/constants";

type PoolGlobal = { mediaPool?: Pool };

function databaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const match = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
    if (!match) return raw;
    // The direct host is IPv6-only. The IPv4 pooler is the one this project can reach.
    url.hostname = "aws-0-us-west-2.pooler.supabase.com";
    url.port = "5432";
    url.username = `postgres.${match[1]}`;
    return url.toString();
  } catch {
    return raw;
  }
}

function pool() {
  const connectionString = databaseUrl();
  if (!connectionString) return null;
  const host = globalThis as typeof globalThis & PoolGlobal;
  if (!host.mediaPool) {
    host.mediaPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return host.mediaPool;
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function numberOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapItem(row: QueryResultRow): MediaItem {
  return {
    id: text(row.id),
    postId: text(row.post_id),
    kind: text(row.type) as MediaItem["kind"],
    url: text(row.url),
    thumbnailUrl: text(row.thumbnail_url),
    alt: text(row.alt_text),
    caption: text(row.caption),
    sortOrder: Number(row.sort_order) || 0,
    fileName: text(row.file_name),
    fileSize: numberOrNull(row.file_size),
    width: numberOrNull(row.width),
    height: numberOrNull(row.height),
    durationSeconds: numberOrNull(row.duration_seconds),
    mimeType: text(row.mime_type),
    bucket: text(row.bucket),
    storagePath: text(row.storage_path),
    createdAt: text(row.created_at),
  };
}

function mapPost(row: QueryResultRow): MediaPost {
  const rawItems = Array.isArray(row.items) ? row.items : [];
  return {
    id: text(row.id),
    title: text(row.title),
    slug: text(row.slug),
    description: text(row.description),
    type: text(row.type) as MediaType,
    category: text(row.category),
    tags: Array.isArray(row.tags) ? row.tags.map((tag) => text(tag)).filter(Boolean) : [],
    status: text(row.status) === "published" ? "published" : "draft",
    articlePath: text(row.article_path),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    publishedAt: row.published_at ? text(row.published_at) : null,
    items: rawItems.map((item) => mapItem(item as QueryResultRow)).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

const postSelect = `
  select
    posts.*,
    coalesce(
      json_agg(to_jsonb(items) order by items.sort_order) filter (where items.id is not null),
      '[]'::json
    ) as items
  from public.media_posts as posts
  left join public.media_items as items on items.post_id = posts.id
`;

function likeTerm(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function listMedia(options: {
  publishedOnly: boolean;
  query?: string;
  type?: string;
  category?: string;
  status?: string;
}) {
  const db = pool();
  if (!db) return [];
  const filters = ["true"];
  const values: unknown[] = [];
  if (options.publishedOnly) filters.push(`posts.status = 'published'`);
  if (options.status === "draft" || options.status === "published") {
    values.push(options.status);
    filters.push(`posts.status = $${values.length}`);
  }
  if (options.type) {
    values.push(options.type);
    filters.push(`posts.type = $${values.length}`);
  }
  if (options.category) {
    values.push(options.category);
    filters.push(`posts.category = $${values.length}`);
  }
  const query = options.query?.trim();
  if (query) {
    values.push(likeTerm(query));
    const mark = `$${values.length}`;
    filters.push(`(
      posts.title ilike ${mark} escape '\\'
      or posts.description ilike ${mark} escape '\\'
      or posts.category ilike ${mark} escape '\\'
      or exists (select 1 from unnest(posts.tags) as tag where tag ilike ${mark} escape '\\')
    )`);
  }
  try {
    const result = await db.query(
      `${postSelect}
       where ${filters.join(" and ")}
       group by posts.id
       order by coalesce(posts.published_at, posts.created_at) desc`,
      values,
    );
    return result.rows.map(mapPost);
  } catch (error) {
    console.error("media list", error instanceof Error ? error.message : "query");
    return [];
  }
}

export async function getMediaBySlug(slug: string, publishedOnly: boolean) {
  const db = pool();
  if (!db) return null;
  try {
    const result = await db.query(
      `${postSelect}
       where posts.slug = $1
         and ($2::boolean = false or posts.status = 'published')
       group by posts.id
       limit 1`,
      [slug, publishedOnly],
    );
    return result.rows[0] ? mapPost(result.rows[0]) : null;
  } catch (error) {
    console.error("media slug", error instanceof Error ? error.message : "query");
    return null;
  }
}

export async function getMediaById(id: string) {
  const db = pool();
  if (!db) return null;
  try {
    const result = await db.query(
      `${postSelect} where posts.id = $1 group by posts.id limit 1`,
      [id],
    );
    return result.rows[0] ? mapPost(result.rows[0]) : null;
  } catch (error) {
    console.error("media id", error instanceof Error ? error.message : "query");
    return null;
  }
}

export async function slugExists(slug: string, exceptId?: string) {
  const db = pool();
  if (!db) return false;
  const result = await db.query(
    `select 1 from public.media_posts where slug = $1 and ($2::uuid is null or id <> $2::uuid) limit 1`,
    [slug, exceptId ?? null],
  );
  return result.rowCount !== 0 && (result.rowCount ?? 0) > 0;
}

export async function neighbors(post: MediaPost) {
  const db = pool();
  const empty = { previous: null as MediaPost | null, next: null as MediaPost | null };
  if (!db || !post.publishedAt) return empty;
  try {
  const newer = await db.query(
    `${postSelect}
     where posts.status = 'published' and posts.published_at > $1
     group by posts.id
     order by posts.published_at asc
     limit 1`,
    [post.publishedAt],
  );
  const older = await db.query(
    `${postSelect}
     where posts.status = 'published' and posts.published_at < $1
     group by posts.id
     order by posts.published_at desc
     limit 1`,
    [post.publishedAt],
  );
  return {
    previous: newer.rows[0] ? mapPost(newer.rows[0]) : null,
    next: older.rows[0] ? mapPost(older.rows[0]) : null,
  };
  } catch (error) {
    console.error("media neighbors", error instanceof Error ? error.message : "query");
    return empty;
  }
}

export async function relatedMedia(post: MediaPost, limit = 3) {
  const db = pool();
  if (!db) return [];
  try {
    const result = await db.query(
      `${postSelect}
       where posts.status = 'published'
         and posts.id <> $1
         and (posts.category = $2 or posts.tags && $3::text[])
       group by posts.id
       order by (posts.category = $2) desc, posts.published_at desc nulls last
       limit $4`,
      [post.id, post.category, post.tags, limit],
    );
    return result.rows.map(mapPost);
  } catch (error) {
    console.error("media related", error instanceof Error ? error.message : "query");
    return [];
  }
}

export async function latestMedia(limit = 12) {
  return listMedia({ publishedOnly: true }).then((posts) => posts.slice(0, limit));
}

export function pickHomepageMedia(posts: MediaPost[]) {
  const picked: MediaPost[] = [];
  for (const type of ["video", "gallery", "update"] as const) {
    const match = posts.find((post) => post.type === type && !picked.some((item) => item.id === post.id));
    if (match) picked.push(match);
  }
  for (const post of posts) {
    if (picked.length >= 3) break;
    if (!picked.some((item) => item.id === post.id)) picked.push(post);
  }
  return picked.slice(0, 3);
}

export async function saveMediaPost(input: {
  id?: string;
  title: string;
  slug: string;
  description: string;
  type: MediaType;
  category: string;
  tags: string[];
  status: "draft" | "published";
  articlePath: string;
  publishedAt: string | null;
  items: MediaDraftItem[];
}) {
  const db = pool();
  if (!db) throw new Error("DATABASE_URL manquant.");
  const client = await db.connect();
  try {
    await client.query("begin");
    let id = input.id;
    if (id) {
      const updated = await client.query(
        `update public.media_posts
         set title = $2,
             slug = $3,
             description = $4,
             type = $5,
             category = $6,
             tags = $7,
             status = $8,
             article_path = $9,
             published_at = $10,
             updated_at = now()
         where id = $1
         returning id`,
        [
          id,
          input.title,
          input.slug,
          input.description,
          input.type,
          input.category,
          input.tags,
          input.status,
          input.articlePath,
          input.publishedAt,
        ],
      );
      if (!updated.rowCount) throw new Error("Publication introuvable.");
      await client.query(`delete from public.media_items where post_id = $1`, [id]);
    } else {
      const inserted = await client.query(
        `insert into public.media_posts
          (title, slug, description, type, category, tags, status, article_path, published_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning id`,
        [
          input.title,
          input.slug,
          input.description,
          input.type,
          input.category,
          input.tags,
          input.status,
          input.articlePath,
          input.publishedAt,
        ],
      );
      id = text(inserted.rows[0]?.id);
    }
    for (const [index, item] of input.items.entries()) {
      await client.query(
        `insert into public.media_items
          (post_id, type, url, thumbnail_url, alt_text, caption, sort_order, file_name, file_size, width, height, duration_seconds, mime_type, bucket, storage_path)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          id,
          item.kind,
          item.url,
          item.thumbnailUrl,
          item.alt,
          item.caption,
          index,
          item.fileName,
          item.fileSize,
          item.width,
          item.height,
          item.durationSeconds,
          item.mimeType,
          item.bucket,
          item.storagePath,
        ],
      );
    }
    await client.query("commit");
    return id ?? "";
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMediaPost(id: string) {
  const db = pool();
  if (!db) throw new Error("DATABASE_URL manquant.");
  const existing = await getMediaById(id);
  await db.query(`delete from public.media_posts where id = $1`, [id]);
  return existing;
}

export async function setMediaStatus(id: string, status: "draft" | "published") {
  const db = pool();
  if (!db) throw new Error("DATABASE_URL manquant.");
  await db.query(
    `update public.media_posts
     set status = $2,
         published_at = case
           when $2 = 'published' then coalesce(published_at, now())
           else published_at
         end,
         updated_at = now()
     where id = $1`,
    [id, status],
  );
}

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function dbPool() {
  return pool();
}
