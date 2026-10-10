import Link from "next/link";
import { categoryTree, loadCategories } from "@/lib/talents/queries";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const groups = categoryTree(await loadCategories());
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-bold">Catégories</h1>
      <ul className="grid gap-3">
        {groups.map((group) => (
          <li key={group.parent.id} className="panel p-4">
            <Link href={`/talents/categories/${group.parent.slug}`} className="text-lg font-bold">{group.parent.name}</Link>
            {group.parent.description ? <p className="mt-1 text-sm text-muted">{group.parent.description}</p> : null}
            <ul className="mt-3 flex flex-wrap gap-2">
              {group.children.map((child) => (
                <li key={child.id}><Link href={`/talents/categories/${child.slug}`} className="inline-block bg-[#e7f1ff] px-3 py-2 text-sm font-semibold text-[#1557c0]">{child.name}</Link></li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
