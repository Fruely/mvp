import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { jsonNoStore } from "@/lib/api/response";
import { notify } from "@/lib/notifications/notify";
import { buildSpecialistSlug } from "@/lib/slugify";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonNoStore({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("id, slug, status, name, category_id, languages, work_format, postal_code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (specialistError || !specialist?.id) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const specialistId = specialist.id as string;

  const missing: string[] = [];
  if (!specialist.name) missing.push("Имя");
  if (!specialist.category_id) missing.push("Категория");
  if (!specialist.languages || specialist.languages.length === 0) missing.push("Языки");
  if (!specialist.work_format) missing.push("Формат работы");
  if (specialist.work_format !== "online" && !specialist.postal_code) {
    missing.push("Почтовый индекс");
  }

  if (missing.length) {
    return NextResponse.json(
      {
        error: "Заполните обязательные поля",
        fields: missing,
      },
      { status: 400 }
    );
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id, parent_id, slug")
    .eq("id", specialist.category_id)
    .maybeSingle();
  if (!category) {
    return jsonNoStore({ error: "Invalid category" }, { status: 400 });
  }
  if (category.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG) {
    return jsonNoStore(
      {
        error:
          "Нельзя опубликовать профиль с категорией «Другое». Выберите категорию каталога или дождитесь решения администратора.",
      },
      { status: 400 }
    );
  }
  if (!category.parent_id) {
    return jsonNoStore(
      { error: "Invalid category: parent category cannot be selected" },
      { status: 400 }
    );
  }

  const { data: services, error: servicesCheckError } = await supabase
    .from("specialist_services")
    .select("title, price_from, is_active")
    .eq("specialist_id", specialistId)
    .eq("category_id", specialist.category_id as string)
    .eq("is_active", true);

  if (servicesCheckError) {
    return jsonNoStore({ error: "Failed to validate services" }, { status: 500 });
  }

  const hasValid = services?.some((s) => {
    const title = typeof s?.title === "string" ? s.title.trim() : "";
    if (!title) return false;

    const raw = String(s.price_from ?? "").trim();
    if (!raw) return false;

    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) && n > 0;
  });

  if (!hasValid) {
    return jsonNoStore(
      { error: "Добавьте хотя бы одну услугу с ценой больше 0" },
      { status: 400 }
    );
  }

  let generatedSlug: string | null = null;

  if (!specialist.slug) {
    let categorySlug: string | null = null;
    if (specialist.category_id) {
      const { data: cat } = await supabase
        .from("categories")
        .select("slug")
        .eq("id", specialist.category_id)
        .maybeSingle();
      categorySlug = cat?.slug ?? null;
    }

    let citySlug: string | null = null;

    if (specialist.postal_code) {
      const { data: cityRow } = await supabase
        .from("cities")
        .select("slug")
        .eq("postal_code", specialist.postal_code)
        .maybeSingle();
      citySlug = cityRow?.slug ?? null;
    }

    if (!citySlug) {
      const { data: profile } = await supabase
        .from("specialist_profiles")
        .select("city")
        .eq("specialist_id", specialistId)
        .maybeSingle();
      if (profile?.city) {
        const { data: cityRow } = await supabase
          .from("cities")
          .select("slug")
          .eq("name", profile.city)
          .maybeSingle();
        citySlug = cityRow?.slug ?? null;
      }
    }

    if (specialist.name) {
      const base = buildSpecialistSlug(categorySlug, citySlug, specialist.name);
      let candidate = base;
      let suffix = 2;
      while (true) {
        const { data: existing } = await supabase
          .from("specialists")
          .select("id")
          .eq("slug", candidate)
          .maybeSingle();
        if (!existing) break;
        candidate = `${base}-${suffix}`;
        suffix++;
      }
      generatedSlug = candidate;
    }
  }

  const updatePayload: Record<string, unknown> = {
    status: "published_unverified",
    is_active: true,
    is_visible: true,
    published_at: new Date().toISOString(),
  };
  if (generatedSlug) updatePayload.slug = generatedSlug;

  const { data: updated, error: updateError } = await supabase
    .from("specialists")
    .update(updatePayload)
    .eq("id", specialistId)
    .select("id, status")
    .single();
  if (updateError) {
    return jsonNoStore({ error: "Failed to publish specialist profile" }, { status: 500 });
  }

  const { data: publishedRow } = await supabase
    .from("specialists")
    .select("id, name, published_at, is_active, is_visible")
    .eq("id", specialistId)
    .maybeSingle();

  if (
    publishedRow &&
    (publishedRow.published_at ||
      (publishedRow.is_active === true && publishedRow.is_visible === true))
  ) {
    await notify("NEW_SPECIALIST", {
      name: `🟢 Опубликовался: ${publishedRow.name || "Без имени"}`,
    });
  }

  const { error: founderRpcError } = await supabase.rpc("try_assign_founder_badge", {
    p_specialist_id: specialistId,
  });
  if (founderRpcError) {
    console.warn("[specialist/dashboard/publish] try_assign_founder_badge:", founderRpcError.message);
  }

  return jsonNoStore({ success: true, status: updated.status });
}
