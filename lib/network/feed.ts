import { PAGE_SIZE, type FeedTab } from "@/lib/network/constants";
import { createClient } from "@/lib/supabase/server";

export type FeedAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
};

export type FeedMedia = {
  url: string;
  mediaType: "image" | "video";
  duration: number | null;
};

export type FeedPost = {
  id: string;
  kind: "text" | "photo" | "video";
  body: string;
  createdAt: string;
  communitySlug: string | null;
  communityName: string | null;
  schoolName: string | null;
  author: FeedAuthor;
  media: FeedMedia | null;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
};

type AuthorRow = { id: string; username: string; display_name: string; avatar_url: string };
type MediaRow = { url: string; media_type: "image" | "video"; duration: number | null };
type CommunityRow = { slug: string; name: string };
type SchoolRow = { name: string };
type PostRow = {
  id: string;
  kind: "text" | "photo" | "video";
  body: string;
  created_at: string;
  user_id: string;
  profiles: AuthorRow | AuthorRow[] | null;
  post_media: MediaRow | MediaRow[] | null;
  communities: CommunityRow | CommunityRow[] | null;
  schools: SchoolRow | SchoolRow[] | null;
};

const postSelect =
  "id, kind, body, created_at, user_id, profiles!posts_user_id_fkey(id, username, display_name, avatar_url), post_media(url, media_type, duration), communities!posts_community_id_fkey(slug, name), schools!posts_school_id_fkey(name)";

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapPost(row: PostRow, likes: Map<string, number>, comments: Map<string, number>, liked: Set<string>, saved: Set<string>): FeedPost {
  const author = one(row.profiles);
  const media = one(row.post_media);
  const community = one(row.communities);
  const school = one(row.schools);
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at,
    communitySlug: community?.slug ?? null,
    communityName: community?.name ?? null,
    schoolName: school?.name ?? null,
    author: {
      id: author?.id || row.user_id,
      username: author?.username || "visiteur",
      displayName: author?.display_name || "Visiteur",
      avatarUrl: author?.avatar_url || "",
    },
    media: media ? { url: media.url, mediaType: media.media_type, duration: media.duration } : null,
    likeCount: likes.get(row.id) ?? 0,
    commentCount: comments.get(row.id) ?? 0,
    liked: liked.has(row.id),
    saved: saved.has(row.id),
  };
}

async function counts(ids: string[], userId: string | null) {
  const supabase = await createClient();
  const likes = new Map<string, number>();
  const comments = new Map<string, number>();
  const liked = new Set<string>();
  const saved = new Set<string>();
  if (!supabase || ids.length === 0) return { likes, comments, liked, saved };
  const [likeRows, commentRows, mine, saves] = await Promise.all([
    supabase.from("likes").select("content_id").eq("content_type", "feed").in("content_id", ids),
    supabase.from("comments").select("content_id").eq("content_type", "feed").in("content_id", ids),
    userId ? supabase.from("likes").select("content_id").eq("content_type", "feed").eq("user_id", userId).in("content_id", ids) : Promise.resolve({ data: [] }),
    userId ? supabase.from("saves").select("post_id").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [] }),
  ]);
  for (const row of likeRows.data ?? []) likes.set(row.content_id, (likes.get(row.content_id) ?? 0) + 1);
  for (const row of commentRows.data ?? []) comments.set(row.content_id, (comments.get(row.content_id) ?? 0) + 1);
  for (const row of mine.data ?? []) liked.add(row.content_id);
  for (const row of saves.data ?? []) saved.add(row.post_id);
  return { likes, comments, liked, saved };
}

export async function loadFeed(tab: FeedTab, page: number) {
  const supabase = await createClient();
  if (!supabase) return { ready: false as const, posts: [], hasMore: false };
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  let query = supabase
    .from("posts")
    .select(postSelect)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (tab === "suivis") {
    if (!userId) return { ready: true as const, posts: [], hasMore: false, needsAuth: true };
    const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
    const ids = (follows ?? []).map((row) => row.following_id);
    if (ids.length === 0) return { ready: true as const, posts: [], hasMore: false };
    query = query.in("user_id", ids);
  }
  if (tab === "recent") {
    query = query.gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  }

  const from = tab === "tendances" ? 0 : Math.max(0, page) * PAGE_SIZE;
  const to = tab === "tendances" ? 39 : from + PAGE_SIZE;
  const { data, error } = await query.range(from, to);
  if (error) return { ready: false as const, posts: [], hasMore: false };
  let rows = (data ?? []) as PostRow[];
  const stats = await counts(rows.map((row) => row.id), userId);
  let posts = rows.map((row) => mapPost(row, stats.likes, stats.comments, stats.liked, stats.saved));
  if (tab === "tendances") {
    posts.sort((a, b) => b.likeCount - a.likeCount || +new Date(b.createdAt) - +new Date(a.createdAt));
    const start = Math.max(0, page) * PAGE_SIZE;
    const slice = posts.slice(start, start + PAGE_SIZE + 1);
    return { ready: true as const, posts: slice.slice(0, PAGE_SIZE), hasMore: slice.length > PAGE_SIZE };
  }
  return { ready: true as const, posts: posts.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function loadPost(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("posts")
    .select(postSelect)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { data: auth } = await supabase.auth.getUser();
  const stats = await counts([id], auth.user?.id ?? null);
  return mapPost(data as PostRow, stats.likes, stats.comments, stats.liked, stats.saved);
}

export async function loadProfilePosts(userId: string, kind?: "photo" | "video") {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase
    .from("posts")
    .select(postSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(24);
  if (kind) query = query.eq("kind", kind);
  const { data } = await query;
  const rows = (data ?? []) as PostRow[];
  const { data: auth } = await supabase.auth.getUser();
  const stats = await counts(rows.map((row) => row.id), auth.user?.id ?? null);
  return rows.map((row) => mapPost(row, stats.likes, stats.comments, stats.liked, stats.saved));
}

export async function loadCommunityPosts(communityId: string) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("posts")
    .select(postSelect)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (data ?? []) as PostRow[];
  const { data: auth } = await supabase.auth.getUser();
  const stats = await counts(rows.map((row) => row.id), auth.user?.id ?? null);
  return rows.map((row) => mapPost(row, stats.likes, stats.comments, stats.liked, stats.saved));
}

export async function loadCommunities() {
  const supabase = await createClient();
  if (!supabase) return [];
  const [{ data }, members] = await Promise.all([
    supabase.from("communities").select("id, slug, name, description").order("name"),
    supabase.from("community_members").select("community_id"),
  ]);
  const counts = new Map<string, number>();
  for (const row of members.data ?? []) counts.set(row.community_id, (counts.get(row.community_id) ?? 0) + 1);
  return (data ?? []).map((community) => ({ ...community, members: counts.get(community.id) ?? 0 }));
}

export async function loadCommunity(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("communities").select("id, slug, name, description").eq("slug", slug).maybeSingle();
  return data;
}

export async function communityCounts(communityId: string, userId: string | null) {
  const supabase = await createClient();
  if (!supabase) return { members: 0, joined: false };
  const [members, mine] = await Promise.all([
    supabase.from("community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId),
    userId
      ? supabase.from("community_members").select("user_id").eq("community_id", communityId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { members: members.count ?? 0, joined: Boolean(mine.data) };
}

export type CommunityGroup = {
  id: string;
  name: string;
  schools: { id: string; name: string; members: number; managerName: string | null }[];
  mine: { id: string; name: string; role: "member" | "manager" } | null;
  pendingName: string | null;
};

export async function loadCommunityGroups(communityId: string, userId: string | null) {
  const supabase = await createClient();
  if (!supabase) return [] as CommunityGroup[];
  const { data: groups } = await supabase.from("community_groups").select("id, name").eq("community_id", communityId).eq("kind", "schools").order("name");
  if (!groups?.length) return [] as CommunityGroup[];
  const { data: schools } = await supabase.from("schools").select("id, name, group_id").in("group_id", groups.map((group) => group.id)).order("name");
  const schoolIds = (schools ?? []).map((school) => school.id);
  const { data: members } = schoolIds.length
    ? await supabase.from("school_members").select("school_id, user_id, role").in("school_id", schoolIds)
    : { data: [] as { school_id: string; user_id: string; role: string }[] };
  const managerIds = [...new Set((members ?? []).filter((member) => member.role === "manager").map((member) => member.user_id))];
  const { data: managers } = managerIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", managerIds)
    : { data: [] as { id: string; display_name: string }[] };
  const managerNameByUser = new Map((managers ?? []).map((person) => [person.id, person.display_name]));
  const { data: requests } = userId
    ? await supabase.from("school_requests").select("group_id, name").eq("user_id", userId).eq("status", "pending").in("group_id", groups.map((group) => group.id))
    : { data: [] as { group_id: string; name: string }[] };
  const counts = new Map<string, number>();
  const managerBySchool = new Map<string, string>();
  let mineId = "";
  let mineRole: "member" | "manager" = "member";
  for (const member of members ?? []) {
    counts.set(member.school_id, (counts.get(member.school_id) ?? 0) + 1);
    if (member.role === "manager") managerBySchool.set(member.school_id, managerNameByUser.get(member.user_id) || "Gérant");
    if (userId && member.user_id === userId) {
      mineId = member.school_id;
      mineRole = member.role === "manager" ? "manager" : "member";
    }
  }
  return groups.map((group) => {
    const list = (schools ?? []).filter((school) => school.group_id === group.id);
    const mine = list.find((school) => school.id === mineId);
    return {
      id: group.id,
      name: group.name,
      schools: list.map((school) => ({
        id: school.id,
        name: school.name,
        members: counts.get(school.id) ?? 0,
        managerName: managerBySchool.get(school.id) ?? null,
      })),
      mine: mine ? { id: mine.id, name: mine.name, role: mineRole } : null,
      pendingName: (requests ?? []).find((request) => request.group_id === group.id)?.name ?? null,
    };
  });
}

export type MemberGroup = {
  id: string;
  name: string;
  status: "open" | "closed";
  warning: string;
  ownerName: string;
  members: number;
  mine: "admin" | "member" | null;
  people: { id: string; name: string }[];
};

export async function loadMemberGroups(communityId: string, userId: string | null) {
  const supabase = await createClient();
  if (!supabase) return [] as MemberGroup[];
  const { data: groups } = await supabase
    .from("community_groups")
    .select("id, name, status, warning, owner_id")
    .eq("community_id", communityId)
    .eq("kind", "member")
    .order("name");
  if (!groups?.length) return [] as MemberGroup[];
  const groupIds = groups.map((group) => group.id);
  const { data: memberships } = await supabase.from("group_members").select("group_id, user_id, role").in("group_id", groupIds);
  const peopleIds = [...new Set((memberships ?? []).map((member) => member.user_id))];
  const { data: people } = peopleIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", peopleIds)
    : { data: [] as { id: string; display_name: string }[] };
  const nameById = new Map((people ?? []).map((person) => [person.id, person.display_name]));
  return groups.flatMap((group) => {
    const rows = (memberships ?? []).filter((member) => member.group_id === group.id);
    const mine = rows.find((member) => member.user_id === userId);
    if (group.status === "closed" && !mine) return [];
    const role: MemberGroup["mine"] = mine?.role === "admin" ? "admin" : mine ? "member" : null;
    return [{
      id: group.id,
      name: group.name,
      status: group.status === "closed" ? "closed" as const : "open" as const,
      warning: group.warning || "",
      ownerName: nameById.get(group.owner_id) || "Administrateur",
      members: rows.length,
      mine: role,
      people: role === "admin" ? rows.filter((member) => member.role !== "admin").map((member) => ({ id: member.user_id, name: nameById.get(member.user_id) || "Membre" })) : [],
    }];
  });
}

export async function loadMySchools(userId: string) {
  const supabase = await createClient();
  if (!supabase) return [] as { communityId: string; schoolId: string; schoolName: string }[];
  const { data: memberships } = await supabase.from("school_members").select("school_id").eq("user_id", userId);
  const ids = (memberships ?? []).map((row) => row.school_id);
  if (ids.length === 0) return [];
  const { data: schools } = await supabase.from("schools").select("id, name, group_id").in("id", ids);
  const groupIds = [...new Set((schools ?? []).map((school) => school.group_id))];
  const { data: groups } = await supabase.from("community_groups").select("id, community_id").in("id", groupIds);
  const communityByGroup = new Map((groups ?? []).map((group) => [group.id, group.community_id]));
  return (schools ?? []).flatMap((school) => {
    const communityId = communityByGroup.get(school.group_id);
    if (!communityId) return [];
    return [{ communityId, schoolId: school.id, schoolName: school.name }];
  });
}

export type ProfileActivity = {
  groups: {
    id: string;
    name: string;
    status: "open" | "closed";
    warning: string;
    role: "admin" | "member";
    members: number;
    communityName: string;
    communitySlug: string;
    people: { id: string; name: string }[];
  }[];
  schools: {
    id: string;
    name: string;
    role: "manager" | "member";
    communityName: string;
    communitySlug: string;
  }[];
  communities: { id: string; name: string; slug: string }[];
};

const emptyActivity: ProfileActivity = { groups: [], schools: [], communities: [] };

export async function loadProfileActivity(userId: string, viewerId: string | null): Promise<ProfileActivity> {
  const supabase = await createClient();
  if (!supabase) return emptyActivity;
  const [groupMemberships, schoolMemberships, communityMemberships] = await Promise.all([
    supabase.from("group_members").select("group_id, role").eq("user_id", userId),
    supabase.from("school_members").select("school_id, role").eq("user_id", userId),
    supabase.from("community_members").select("community_id").eq("user_id", userId),
  ]);

  const ownedRows = groupMemberships.data ?? [];
  let groupRows = ownedRows;
  if (viewerId !== userId) {
    const ownedIds = ownedRows.map((row) => row.group_id);
    if (!viewerId || ownedIds.length === 0) {
      groupRows = [];
    } else {
      const { data: shared } = await supabase.from("group_members").select("group_id").eq("user_id", viewerId).in("group_id", ownedIds);
      const sharedIds = new Set((shared ?? []).map((row) => row.group_id));
      groupRows = ownedRows.filter((row) => sharedIds.has(row.group_id));
    }
  }
  const groupIds = groupRows.map((row) => row.group_id);
  const { data: groups } = groupIds.length
    ? await supabase.from("community_groups").select("id, name, status, warning, community_id").in("id", groupIds).eq("kind", "member")
    : { data: [] as { id: string; name: string; status: string; warning: string; community_id: string }[] };
  const { data: groupPeople } = groupIds.length
    ? await supabase.from("group_members").select("group_id, user_id, role").in("group_id", groupIds)
    : { data: [] as { group_id: string; user_id: string; role: string }[] };
  const managedIds = new Set(viewerId === userId ? groupRows.filter((row) => row.role === "admin").map((row) => row.group_id) : []);
  const peopleIds = [...new Set((groupPeople ?? []).filter((person) => managedIds.has(person.group_id)).map((person) => person.user_id))];

  const schoolRows = schoolMemberships.data ?? [];
  const schoolIds = schoolRows.map((row) => row.school_id);
  const { data: schools } = schoolIds.length
    ? await supabase.from("schools").select("id, name, group_id").in("id", schoolIds)
    : { data: [] as { id: string; name: string; group_id: string }[] };
  const schoolGroupIds = [...new Set((schools ?? []).map((school) => school.group_id))];

  const communityIds = [
    ...new Set([
      ...(groups ?? []).map((group) => group.community_id),
      ...(communityMemberships.data ?? []).map((row) => row.community_id),
    ]),
  ];
  const [{ data: schoolGroups }, { data: communities }, { data: people }] = await Promise.all([
    schoolGroupIds.length
      ? supabase.from("community_groups").select("id, community_id").in("id", schoolGroupIds)
      : Promise.resolve({ data: [] as { id: string; community_id: string }[] }),
    communityIds.length
      ? supabase.from("communities").select("id, name, slug").in("id", communityIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    peopleIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", peopleIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
  ]);

  const schoolCommunityIds = [...new Set((schoolGroups ?? []).map((group) => group.community_id))].filter((id) => !communityIds.includes(id));
  const { data: extraCommunities } = schoolCommunityIds.length
    ? await supabase.from("communities").select("id, name, slug").in("id", schoolCommunityIds)
    : { data: [] as { id: string; name: string; slug: string }[] };
  const communityById = new Map([...(communities ?? []), ...(extraCommunities ?? [])].map((community) => [community.id, community]));
  const communityBySchoolGroup = new Map((schoolGroups ?? []).map((group) => [group.id, group.community_id]));
  const nameById = new Map((people ?? []).map((person) => [person.id, person.display_name]));
  const roleByGroup = new Map(groupRows.map((row) => [row.group_id, row.role === "admin" ? "admin" as const : "member" as const]));
  const counts = new Map<string, number>();
  for (const person of groupPeople ?? []) counts.set(person.group_id, (counts.get(person.group_id) ?? 0) + 1);

  return {
    groups: (groups ?? []).map((group) => {
      const community = communityById.get(group.community_id);
      const role = roleByGroup.get(group.id) ?? "member";
      return {
        id: group.id,
        name: group.name,
        status: group.status === "closed" ? "closed" as const : "open" as const,
        warning: viewerId === userId ? group.warning || "" : "",
        role,
        members: counts.get(group.id) ?? 0,
        communityName: community?.name || "Communauté",
        communitySlug: community?.slug || "",
        people: managedIds.has(group.id)
          ? (groupPeople ?? []).filter((person) => person.group_id === group.id && person.role !== "admin").map((person) => ({ id: person.user_id, name: nameById.get(person.user_id) || "Membre" }))
          : [],
      };
    }).sort((a, b) => Number(b.role === "admin") - Number(a.role === "admin") || a.name.localeCompare(b.name, "fr")),
    schools: (schools ?? []).flatMap((school) => {
      const community = communityById.get(communityBySchoolGroup.get(school.group_id) || "");
      if (!community) return [];
      const role = schoolRows.find((row) => row.school_id === school.id)?.role === "manager" ? "manager" as const : "member" as const;
      return [{ id: school.id, name: school.name, role, communityName: community.name, communitySlug: community.slug }];
    }),
    communities: (communityMemberships.data ?? []).flatMap((row) => {
      const community = communityById.get(row.community_id);
      if (!community) return [];
      return [{ id: community.id, name: community.name, slug: community.slug }];
    }).sort((a, b) => a.name.localeCompare(b.name, "fr")),
  };
}
