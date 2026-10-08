import Link from "next/link";

export function CommunityCard({
  community,
}: {
  community: { slug: string; name: string; description: string; members: number };
}) {
  const members = `${community.members} ${community.members > 1 ? "membres" : "membre"}`;
  return (
    <Link href={`/communautes/${community.slug}`} className="card-hover flex h-full flex-col border border-line bg-white">
      <img src={`/communities/${community.slug}.jpg`} alt="" className="aspect-[16/9] w-full object-cover" />
      <span className="grid flex-1 gap-2 p-4">
        <span className="text-lg font-bold">{community.name}</span>
        <span className="text-sm leading-6 text-muted">{community.description}</span>
        <span className="mt-auto text-xs font-semibold text-muted">{members}</span>
      </span>
    </Link>
  );
}
