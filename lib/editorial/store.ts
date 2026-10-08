import type { QueryResultRow } from "pg";
import { dbPool } from "@/lib/media/db";
import type { EditorialKind, EditorialStatus } from "@/lib/editorial/constants";

export type EditorialProfile = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  description: string;
  category: string;
  isActive: boolean;
  archivedAt: string;
  createdAt: string;
};

export type EditorialItem = {
  id: string;
  profileId: string;
  profileName: string;
  profileSlug: string;
  kind: EditorialKind;
  title: string;
  body: string;
  discussion: string;
  category: string;
  language: string;
  source: string;
  note: string;
  coverUrl: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "";
  fileSize: number | null;
  duration: number | null;
  status: EditorialStatus;
  scheduledAt: string;
  publishedAt: string;
  error: string;
  publishAttempts: number;
  createdAt: string;
};

export type EditorialSettings = {
  paused: boolean;
  maxPerDay: number;
  minIntervalMinutes: number;
  timezone: string;
};

export type EditorialEvent = {
  id: string;
  itemId: string;
  action: string;
  detail: string;
  createdAt: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function mapProfile(row: QueryResultRow): EditorialProfile {
  return {
    id: text(row.id),
    name: text(row.name),
    slug: text(row.slug),
    avatarUrl: text(row.avatar_url),
    description: text(row.description),
    category: text(row.category),
    isActive: row.is_active === true,
    archivedAt: text(row.archived_at),
    createdAt: text(row.created_at),
  };
}

function mapItem(row: QueryResultRow): EditorialItem {
  const media = text(row.media_type);
  return {
    id: text(row.id),
    profileId: text(row.profile_id),
    profileName: text(row.profile_name),
    profileSlug: text(row.profile_slug),
    kind: text(row.kind) as EditorialKind,
    title: text(row.title),
    body: text(row.body),
    discussion: text(row.discussion),
    category: text(row.category),
    language: text(row.language),
    source: text(row.source),
    note: text(row.note),
    coverUrl: text(row.cover_url),
    mediaUrl: text(row.media_url),
    mediaType: media === "image" || media === "video" ? media : "",
    fileSize: row.file_size == null ? null : Number(row.file_size),
    duration: row.duration == null ? null : Number(row.duration),
    status: text(row.status) as EditorialStatus,
    scheduledAt: text(row.scheduled_at),
    publishedAt: text(row.published_at),
    error: text(row.error),
    publishAttempts: Number(row.publish_attempts) || 0,
    createdAt: text(row.created_at),
  };
}

const itemSelect = `
  select i.*, p.name as profile_name, p.slug as profile_slug
  from public.editorial_items i
  join public.editorial_profiles p on p.id = i.profile_id
`;

export function editorialDatabase() {
  return dbPool();
}

export async function listProfiles(includeArchived = true) {
  const db = dbPool();
  if (!db) return [];
  const { rows } = await db.query(
    `select * from public.editorial_profiles
     where $1::boolean or archived_at is null
     order by archived_at nulls first, name`,
    [includeArchived],
  );
  return rows.map(mapProfile);
}

export async function getProfile(id: string) {
  const db = dbPool();
  if (!db) return null;
  const { rows } = await db.query(`select * from public.editorial_profiles where id = $1`, [id]);
  return rows[0] ? mapProfile(rows[0]) : null;
}

export async function listItems(filters: {
  status?: string;
  profileId?: string;
  kind?: string;
  category?: string;
  q?: string;
  limit?: number;
}) {
  const db = dbPool();
  if (!db) return [];
  const values: unknown[] = [];
  const where: string[] = [];
  if (filters.status) {
    values.push(filters.status);
    where.push(`i.status = $${values.length}`);
  }
  if (filters.profileId) {
    values.push(filters.profileId);
    where.push(`i.profile_id = $${values.length}`);
  }
  if (filters.kind) {
    values.push(filters.kind);
    where.push(`i.kind = $${values.length}`);
  }
  if (filters.category) {
    values.push(filters.category);
    where.push(`i.category = $${values.length}`);
  }
  if (filters.q) {
    values.push(`%${filters.q.slice(0, 80)}%`);
    where.push(`(i.title ilike $${values.length} or i.body ilike $${values.length})`);
  }
  values.push(Math.min(200, filters.limit ?? 80));
  const { rows } = await db.query(
    `${itemSelect} ${where.length ? `where ${where.join(" and ")}` : ""} order by coalesce(i.scheduled_at, i.published_at, i.created_at) desc limit $${values.length}`,
    values,
  );
  return rows.map(mapItem);
}

export async function getItem(id: string) {
  const db = dbPool();
  if (!db) return null;
  const { rows } = await db.query(`${itemSelect} where i.id = $1`, [id]);
  return rows[0] ? mapItem(rows[0]) : null;
}

export async function getSettings(): Promise<EditorialSettings> {
  const db = dbPool();
  if (!db) return { paused: false, maxPerDay: 6, minIntervalMinutes: 60, timezone: "America/Port-au-Prince" };
  const { rows } = await db.query(`select * from public.editorial_settings where id = 1`);
  const row = rows[0];
  if (!row) return { paused: false, maxPerDay: 6, minIntervalMinutes: 60, timezone: "America/Port-au-Prince" };
  return {
    paused: row.paused === true,
    maxPerDay: Number(row.max_per_day) || 6,
    minIntervalMinutes: Number(row.min_interval_minutes) || 60,
    timezone: text(row.timezone) || "America/Port-au-Prince",
  };
}

export async function listEvents(limit = 40) {
  const db = dbPool();
  if (!db) return [];
  const { rows } = await db.query(
    `select id, item_id, action, detail, created_at from public.editorial_events order by created_at desc limit $1`,
    [limit],
  );
  return rows.map((row) => ({
    id: text(row.id),
    itemId: text(row.item_id),
    action: text(row.action),
    detail: text(row.detail),
    createdAt: text(row.created_at),
  }));
}

export async function studioStats() {
  const db = dbPool();
  const empty = {
    activeProfiles: 0,
    drafts: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
    likes: 0,
    comments: 0,
    byProfile: [] as { name: string; count: number }[],
    byCategory: [] as { category: string; count: number }[],
  };
  if (!db) return empty;
  const [counts, profiles, categories, reactions] = await Promise.all([
    db.query(`select
      (select count(*) from public.editorial_profiles where is_active and archived_at is null) as active_profiles,
      (select count(*) from public.editorial_items where status = 'draft') as drafts,
      (select count(*) from public.editorial_items where status = 'scheduled') as scheduled,
      (select count(*) from public.editorial_items where status = 'published') as published,
      (select count(*) from public.editorial_items where status = 'failed') as failed`),
    db.query(`select p.name, count(i.id)::int as count
      from public.editorial_profiles p
      left join public.editorial_items i on i.profile_id = p.id and i.status = 'published'
      group by p.name order by p.name`),
    db.query(`select category, count(*)::int as count from public.editorial_items where status = 'published' and category <> '' group by category order by count desc`),
    db.query(`select
      (select count(*) from public.likes where content_type = 'feed' and content_id in (select id::text from public.editorial_items where status = 'published' and kind <> 'article')) as likes,
      (select count(*) from public.comments where content_type in ('feed', 'article') and content_id in (select id::text from public.editorial_items where status = 'published')) as comments`),
  ]);
  const row = counts.rows[0] ?? {};
  return {
    activeProfiles: Number(row.active_profiles) || 0,
    drafts: Number(row.drafts) || 0,
    scheduled: Number(row.scheduled) || 0,
    published: Number(row.published) || 0,
    failed: Number(row.failed) || 0,
    likes: Number(reactions.rows[0]?.likes) || 0,
    comments: Number(reactions.rows[0]?.comments) || 0,
    byProfile: profiles.rows.map((item) => ({ name: text(item.name), count: Number(item.count) || 0 })),
    byCategory: categories.rows.map((item) => ({ category: text(item.category), count: Number(item.count) || 0 })),
  };
}

export async function takenTimes() {
  const db = dbPool();
  if (!db) return [];
  const { rows } = await db.query(
    `select coalesce(published_at, scheduled_at) as at
     from public.editorial_items
     where status in ('scheduled', 'published')
       and coalesce(published_at, scheduled_at) is not null`,
  );
  return rows.map((row) => new Date(text(row.at))).filter((date) => !Number.isNaN(date.getTime()));
}

export async function profileDesk(profileId: string) {
  const db = dbPool();
  const empty = { followers: 0, people: [] as { name: string; username: string }[], comments: [] as { id: string; body: string; name: string }[], reports: [] as { id: string; reason: string; status: string; target: string }[] };
  if (!db) return empty;
  const [count, people, comments, reports] = await Promise.all([
    db.query(`select count(*)::int as n from public.follows where editorial_id = $1`, [profileId]),
    db.query(
      `select p.display_name, p.username
       from public.follows f
       join public.profiles p on p.id = f.follower_id
       where f.editorial_id = $1
       order by f.created_at desc
       limit 12`,
      [profileId],
    ),
    db.query(
      `select c.id, c.body, p.display_name
       from public.comments c
       join public.profiles p on p.id = c.user_id
       where c.content_id in (select id::text from public.editorial_items where profile_id = $1)
       order by c.created_at desc
       limit 8`,
      [profileId],
    ),
    db.query(
      `select id, reason, status, target_type
       from public.reports
       where target_id = $1
          or target_id in (select id::text from public.editorial_items where profile_id = $2::uuid)
       order by created_at desc
       limit 8`,
      [profileId, profileId],
    ),
  ]);
  return {
    followers: Number(count.rows[0]?.n) || 0,
    people: people.rows.map((row) => ({ name: text(row.display_name), username: text(row.username) })),
    comments: comments.rows.map((row) => ({ id: text(row.id), body: text(row.body), name: text(row.display_name) })),
    reports: reports.rows.map((row) => ({ id: text(row.id), reason: text(row.reason), status: text(row.status), target: text(row.target_type) })),
  };
}

export async function logEvent(itemId: string | null, profileId: string | null, action: string, detail = "") {
  const db = dbPool();
  if (!db) return;
  await db.query(
    `insert into public.editorial_events (item_id, profile_id, action, detail) values ($1, $2, $3, $4)`,
    [itemId, profileId, action.slice(0, 40), detail.slice(0, 280)],
  );
}
