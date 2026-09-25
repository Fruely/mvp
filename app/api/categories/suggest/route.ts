import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";
import {
  parseCategorySuggestLimit,
  suggestCategories,
} from "@/lib/categories/suggestCategories";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await suggestCategories(createSupabaseServerClient(), {
      query: searchParams.get("q"),
      langCode: normalizeSearchLangToDbCode(searchParams.get("lang")),
      limit: parseCategorySuggestLimit(searchParams.get("limit")),
    });

    if (!result.ok) {
      console.error(`[categories/suggest] ${result.stage}`, result.error);
      return jsonNoStore({ error: "Failed to load suggestions" }, { status: 500 });
    }

    return jsonNoStore({ data: result.data });
  } catch (e: unknown) {
    console.error("[categories/suggest]", e);
    return jsonNoStore({ error: "Failed to load suggestions" }, { status: 500 });
  }
}
