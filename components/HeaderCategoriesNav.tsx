import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CategoryRow = {
  id: string;
  slug: string;
  title: string | null;
};

export default async function HeaderCategoriesNav({ lang }: { lang: string }) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, title")
    .order("title", { ascending: true });

  if (error) {
    console.error("[HeaderCategoriesNav]", error);
    return null;
  }

  const categories = (data ?? []) as CategoryRow[];
  if (!categories.length) return null;

  return (
    <div className="min-w-[260px] max-h-[70vh] overflow-y-auto py-2">
      <ul className="space-y-0.5 px-2">
        {categories.map((cat) => (
          <li key={cat.id}>
            <Link
              href={`/${lang}/category/${cat.slug}`}
              className="block text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 py-1.5 px-2 -mx-2 rounded transition"
            >
              {cat.title ?? cat.slug}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
