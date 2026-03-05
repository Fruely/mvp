import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicSpecialistCountsByServiceCategory } from "@/lib/specialists/publicCategoryCounts";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  slug: string | null;
  title: string | null;
  parent_id?: string | null;
};

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

function isCategoryClickable(specialistsCount: number, minCount: number): boolean {
  // Keep empty categories visible in API while preventing dead links in UI.
  return specialistsCount > 0 && specialistsCount >= minCount;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractServiceKeyDebugInfo() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!serviceKey) {
    return {
      service_key_role: "missing",
      service_key_iss_ref: "missing",
    };
  }

  const payload = decodeJwtPayload(serviceKey);
  const role =
    payload && typeof payload.role === "string" ? payload.role : "unknown";

  let issRef = "unknown";
  const iss = payload && typeof payload.iss === "string" ? payload.iss : "";
  if (iss) {
    try {
      const host = new URL(iss).hostname;
      const ref = host.split(".")[0];
      if (ref) issRef = ref;
    } catch {
      issRef = "invalid";
    }
  }

  return {
    service_key_role: role,
    service_key_iss_ref: issRef,
  };
}

async function loadCategoriesWithOptionalHierarchy() {
  const supabase = createSupabaseServerClient();

  const withParent = await supabase
    .from("categories")
    .select("id, slug, title, parent_id")
    .order("title", { ascending: true });

  if (!withParent.error) {
    return {
      categories: (withParent.data ?? []) as CategoryRow[],
      hasHierarchy: true,
      supabase,
    };
  }

  const fallback = await supabase
    .from("categories")
    .select("id, slug, title")
    .order("title", { ascending: true });

  if (fallback.error) {
    throw fallback.error;
  }

  return {
    categories: ((fallback.data ?? []) as CategoryRow[]).map((category) => ({
      ...category,
      parent_id: null,
    })),
    hasHierarchy: false,
    supabase,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const debugEnabled = searchParams.get("debug") === "1";
    const queryMinCount = parsePositiveInt(searchParams.get("min_count"));
    const minCount = queryMinCount ?? 0;
    const mode = searchParams.get("mode") === "parents" ? "parents" : "children";
    const includeChildren = searchParams.get("include_children") === "1";

    const {
      categories: rawCategories,
      hasHierarchy,
      supabase,
    } = await loadCategoriesWithOptionalHierarchy();

    const normalizedCategories = (rawCategories ?? []).filter(
      (category) =>
        typeof category?.id === "string" &&
        typeof category?.slug === "string" &&
        category.slug.trim().length > 0
    );

    const childCategories =
      hasHierarchy && normalizedCategories.some((category) => category.parent_id)
        ? normalizedCategories.filter((category) => typeof category.parent_id === "string")
        : normalizedCategories;

    const categoryIds = childCategories.map((c) => c.id);
    let countsByCategoryId = new Map<string, number>();
    let debugCountBreakdown:
      | {
          specialists_in_child_categories: number;
          approved_total: number;
          approved_active_total: number;
          approved_active_visible_total: number;
          counted_in_response_total: number;
        }
      | null = null;

    if (categoryIds.length > 0) {
      if (debugEnabled) {
        const { data: servicesForDebug, error: debugError } = await supabase
          .from("specialist_services")
          .select("specialist_id, category_id, is_active, price_from")
          .in("category_id", categoryIds);

        if (!debugError) {
          const rows = servicesForDebug ?? [];
          const active = rows.filter((row) => row.is_active === true);
          const activeWithPrice = active.filter(
            (row) => typeof row.price_from === "number" && Number.isFinite(row.price_from) && row.price_from >= 0
          );

          debugCountBreakdown = {
            specialists_in_child_categories: rows.length,
            approved_total: active.length,
            approved_active_total: activeWithPrice.length,
            approved_active_visible_total: activeWithPrice.length,
            counted_in_response_total: 0,
          };
        }
      }

      try {
        countsByCategoryId = await getPublicSpecialistCountsByServiceCategory(
          supabase,
          categoryIds
        );
      } catch (error) {
        console.error("[specialists/categories] specialists", error);
        return NextResponse.json(
          { error: "Failed to load specialists counts" },
          {
            status: 500,
            headers: { "Cache-Control": "no-store, max-age=0" },
          }
        );
      }

      if (debugCountBreakdown) {
        let countedTotal = 0;
        countsByCategoryId.forEach((value) => {
          countedTotal += value;
        });
        debugCountBreakdown.counted_in_response_total = countedTotal;
      }
    }

    if (mode === "children") {
      const data = childCategories.map((category) => {
        const specialistsCount = countsByCategoryId.get(category.id) ?? 0;
        return {
          id: category.id,
          slug: category.slug,
          title: category.title,
          parent_id: category.parent_id ?? null,
          specialists_count: specialistsCount,
          is_clickable: isCategoryClickable(specialistsCount, minCount),
        };
      });

      const meta: Record<string, unknown> = {
        min_count: minCount,
        mode,
        hierarchy_enabled: hasHierarchy,
      };
      if (debugEnabled) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        const serviceKeyDebug = extractServiceKeyDebugInfo();
        meta._debug = {
          supabase_tail: url ? `***${url.slice(-20)}` : "missing",
          build_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
          vercel_env: process.env.VERCEL_ENV ?? "local",
          ...(debugCountBreakdown ? { count_breakdown: debugCountBreakdown } : {}),
          ...serviceKeyDebug,
        };
      }
      return NextResponse.json(
        { data, meta },
        {
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const childrenByParentId = new Map<string, CategoryRow[]>();
    for (const child of childCategories) {
      if (!child.parent_id) continue;
      const list = childrenByParentId.get(child.parent_id) ?? [];
      list.push(child);
      childrenByParentId.set(child.parent_id, list);
    }

    const parentCandidates = hasHierarchy
      ? normalizedCategories.filter((category) => !category.parent_id)
      : [];

    const parentData = parentCandidates.map((parent) => {
        const children = childrenByParentId.get(parent.id) ?? [];

        const mappedChildren = children.map((child) => {
          const specialistsCount = countsByCategoryId.get(child.id) ?? 0;
          return {
            id: child.id,
            slug: child.slug,
            title: child.title,
            specialists_count: specialistsCount,
            is_clickable: isCategoryClickable(specialistsCount, minCount),
          };
        });

        const parentCount = mappedChildren.reduce(
          (sum, child) => sum + child.specialists_count,
          0
        );

        return {
          id: parent.id,
          slug: parent.slug,
          title: parent.title,
          parent_id: null,
          specialists_count: parentCount,
          is_clickable: isCategoryClickable(parentCount, minCount),
          ...(includeChildren ? { children: mappedChildren } : {}),
        };
      });

    const meta: Record<string, unknown> = {
      min_count: minCount,
      mode,
      hierarchy_enabled: hasHierarchy,
    };
    if (debugEnabled) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const serviceKeyDebug = extractServiceKeyDebugInfo();
      meta._debug = {
        supabase_tail: url ? `***${url.slice(-20)}` : "missing",
        build_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? "local",
        vercel_env: process.env.VERCEL_ENV ?? "local",
        ...(debugCountBreakdown ? { count_breakdown: debugCountBreakdown } : {}),
        ...serviceKeyDebug,
        parent_count: parentData.length,
        raw_parent_count: parentCandidates.length,
      };
    }

    return NextResponse.json(
      {
        data: parentData,
        meta,
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (err: unknown) {
    console.error("[specialists/categories] unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
