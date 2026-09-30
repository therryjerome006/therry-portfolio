import type { QueryResultRow } from "pg";
import type { ActivityCategory } from "@/data/activities";
import { dbPool } from "@/lib/media/db";

export type ActivityItem = {
  id: string;
  kind: "image" | "video";
  url: string;
  bucket: string;
  storagePath: string;
  sortOrder: number;
};

export type ActivityPost = {
  id: string;
  category: ActivityCategory;
  description: string;
  status: "draft" | "published";
  createdAt: string;
  publishedAt: string | null;
  items: ActivityItem[];
};

export type ActivityItemInput = {
  kind: "image" | "video";
  url: string;
  bucket: string;
  storagePath: string;
};

export type ActivityPostInput = {
  id?: string;
  category: ActivityCategory;
  description: string;
  status: "draft" | "published";
  items: ActivityItemInput[];
};

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function mapItem(row: QueryResultRow): ActivityItem {
  return {
    id: text(row.id),
    kind: text(row.kind) === "video" ? "video" : "image",
    url: text(row.url),
    bucket: text(row.bucket),
    storagePath: text(row.storage_path),
    sortOrder: Number(row.sort_order) || 0,
  };
}

function mapPost(row: QueryResultRow): ActivityPost {
  const rawItems = Array.isArray(row.items) ? row.items : [];
  return {
    id: text(row.id),
    category: text(row.category) as ActivityCategory,
    description: text(row.description),
    status: text(row.status) === "published" ? "published" : "draft",
    createdAt: text(row.created_at),
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
  from public.activity_posts as posts
  left join public.activity_items as items on items.post_id = posts.id
`;

export async function listActivityPosts(options: { publishedOnly: boolean; category?: string }) {
  const db = dbPool();
  if (!db) return [];
  const filters = ["true"];
  const values: unknown[] = [];
  if (options.publishedOnly) filters.push(`posts.status = 'published'`);
  if (options.category) {
    values.push(options.category);
    filters.push(`posts.category = $${values.length}`);
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
    console.error("activity list", error instanceof Error ? error.message : "query");
    return [];
  }
}

export async function getActivityPost(id: string) {
  const db = dbPool();
  if (!db || !id) return null;
  try {
    const result = await db.query(
      `${postSelect} where posts.id = $1 group by posts.id limit 1`,
      [id],
    );
    return result.rows[0] ? mapPost(result.rows[0]) : null;
  } catch (error) {
    console.error("activity get", error instanceof Error ? error.message : "query");
    return null;
  }
}

export async function saveActivityPost(input: ActivityPostInput) {
  const db = dbPool();
  if (!db) throw new Error("Base de données indisponible.");
  const client = await db.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `insert into public.activity_posts (id, category, description, status, published_at)
       values (
         coalesce($1::uuid, gen_random_uuid()), $2, $3, $4,
         case when $4 = 'published' then now() else null end
       )
       on conflict (id) do update set
         category = excluded.category,
         description = excluded.description,
         status = excluded.status,
         published_at = case
           when excluded.status = 'published' then coalesce(public.activity_posts.published_at, now())
           else null
         end
       returning id`,
      [input.id || null, input.category, input.description, input.status],
    );
    const id = text(result.rows[0]?.id);
    await client.query(`delete from public.activity_items where post_id = $1`, [id]);
    for (const [index, item] of input.items.entries()) {
      await client.query(
        `insert into public.activity_items (post_id, kind, url, bucket, storage_path, sort_order)
         values ($1, $2, $3, $4, $5, $6)`,
        [id, item.kind, item.url, item.bucket, item.storagePath, index],
      );
    }
    await client.query("commit");
    return id;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function setActivityStatus(id: string, status: "draft" | "published") {
  const db = dbPool();
  if (!db) return;
  await db.query(
    `update public.activity_posts
     set status = $2,
         published_at = case when $2 = 'published' then coalesce(published_at, now()) else null end
     where id = $1`,
    [id, status],
  );
}

export async function deleteActivityPost(id: string) {
  const db = dbPool();
  if (!db) return null;
  const existing = await getActivityPost(id);
  if (!existing) return null;
  await db.query(`delete from public.activity_posts where id = $1`, [id]);
  return existing;
}
