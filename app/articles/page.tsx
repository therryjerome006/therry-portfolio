import type { Metadata } from "next";
import { Magazine } from "@/components/journal/Magazine";
import { loadJournal } from "@/lib/journal/items";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Articles",
  description: "Journal de TY Space : articles de la communauté et textes du développeur.",
};

type Props = { searchParams: Promise<{ rubrique?: string }> };

export default async function ArticlesPage({ searchParams }: Props) {
  const { rubrique } = await searchParams;
  const items = await loadJournal();
  return <Magazine items={items} rubrique={rubrique} />;
}
