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
    <div className="min-w-[260px] max-h-[70vh] overflow-y-auto py-2">
      {Object.entries(grouped).map(([groupSlug, group]) => (
        <div key={groupSlug} className="px-4 py-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {group.title}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/${lang}/category/${item.slug}`}
                  className="block text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 py-1 px-2 -mx-2 rounded transition"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
