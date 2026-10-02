import { EngagementPanel } from "@/components/social/EngagementPanel";
import type { ContentType } from "@/lib/social/content";
import { loadEngagement } from "@/lib/social/queries";

export async function Engagement({ type, id, path }: { type: ContentType; id: string; path: string }) {
  const initial = await loadEngagement(type, id);
  if (!initial) return null;
  return <EngagementPanel type={type} id={id} path={path} initial={initial} />;
}
