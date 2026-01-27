import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Row = {
  group_slug: string;
  group_title: string | null;
  category_slug: string;
  category_title: string | null;
  position?: number;
};

type Group = {
  title: string;
  items: { slug: string; title: string }[];
};

export default async function HeaderCategoriesNav({ lang }: { lang: string }) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("active_categories_by_group")
    .select("*")
    .order("group_slug", { ascending: true })
    .order("position", { ascending: true });

  if (error) {
    console.error("[HeaderCategoriesNav]", error);
    return null;
  }

  const grouped = (data ?? []).reduce<Record<string, Group>>((acc, row: Row) => {
    if (!acc[row.group_slug]) {
      acc[row.group_slug] = {
        title: row.group_title ?? row.group_slug,
        items: [],
      };
    }
    acc[row.group_slug].items.push({
      slug: row.category_slug,
      title: row.category_title ?? row.category_slug,
    });
    return acc;
  }, {});

  return (
    <nav className="flex flex-wrap items-center gap-x-6 gap-y-1">
      {Object.entries(grouped).map(([groupSlug, group]) => (
        <div key={groupSlug} className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-sm font-semibold text-gray-500">
            {group.title}
          </span>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {group.items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/${lang}/category/${item.slug}`}
                  className="text-gray-700 hover:text-blue-600 font-medium transition"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
