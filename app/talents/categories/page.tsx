import Link from "next/link";
import { CategoryArt } from "@/components/talents/CategoryArt";
import { categoryTree, loadCategories } from "@/lib/talents/queries";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const groups = categoryTree(await loadCategories());
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Toutes les catégories</h1>
      <ul className="market-columns mt-6">
        {groups.map((group) => (
          <li key={group.parent.id}>
            <Link href={`/talents/categories/${group.parent.slug}`}>
              <CategoryArt slug={group.parent.slug} title={group.parent.name} />
              <h2>{group.parent.name}</h2>
            </Link>
            <ul>
              {group.children.map((child) => (
                <li key={child.id}><Link href={`/talents/categories/${child.slug}`} className="sub">{child.name}</Link></li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
