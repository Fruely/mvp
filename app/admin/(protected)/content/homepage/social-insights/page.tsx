import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import SocialInsightsForm from "./SocialInsightsForm";
import type {
  LangTriple,
  SocialInsightItemRow,
  SocialInsightsBlockInitial,
} from "./types";

export type { LangTriple, SocialInsightItemRow, SocialInsightsBlockInitial };

const DEFAULT_BLOCK: SocialInsightsBlockInitial = {
  title: { ua: "", ru: "", de: "" },
  subtitle: { ua: "", ru: "", de: "" },
  is_active: false,
};

function normalizeLang(obj: unknown): LangTriple {
  const o = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : {};
  return {
    ua: typeof o.ua === "string" ? o.ua : "",
    ru: typeof o.ru === "string" ? o.ru : "",
    de: typeof o.de === "string" ? o.de : "",
  };
}

function toItem(row: any): SocialInsightItemRow {
  return {
    id: String(row.id ?? ""),
    platform: typeof row.platform === "string" ? row.platform : "telegram",
    partner_name: typeof row.partner_name === "string" ? row.partner_name : "",
    url: typeof row.url === "string" ? row.url : "",
    backlink_required:
      typeof row.backlink_required === "boolean" ? row.backlink_required : true,
    backlink_verified:
      typeof row.backlink_verified === "boolean" ? row.backlink_verified : false,
    is_active: typeof row.is_active === "boolean" ? row.is_active : false,
    title: normalizeLang(row.title),
    excerpt: normalizeLang(row.excerpt),
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export default async function AdminSocialInsightsPage() {
  let initialBlock: SocialInsightsBlockInitial = DEFAULT_BLOCK;
  let items: SocialInsightItemRow[] = [];

  try {
    const supabase = createSupabaseServerClient();

    const { data: blockRow } = await supabase
      .from("homepage_social_insights")
      .select("title, subtitle, is_active")
      .limit(1)
      .maybeSingle();

    if (blockRow) {
      initialBlock = {
        title: normalizeLang(blockRow.title),
        subtitle: normalizeLang((blockRow as any).subtitle),
        is_active:
          typeof (blockRow as any).is_active === "boolean"
            ? (blockRow as any).is_active
            : false,
      };
    }

    const { data: itemRows } = await supabase
      .from("homepage_social_insight_items")
      .select("*")
      .order("created_at", { ascending: false });

    items = (itemRows ?? []).map(toItem);
  } catch {
    initialBlock = DEFAULT_BLOCK;
    items = [];
  }

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Homepage • Social Insights
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Partner-only block. Activate items only when backlink verified.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Dashboard
          </Link>
        </div>

        <SocialInsightsForm initialBlock={initialBlock} items={items} />
      </div>
    </div>
  );
}
