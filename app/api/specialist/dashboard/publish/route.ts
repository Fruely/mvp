import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { notify } from "@/lib/notifications/notify";
import { buildSpecialistSlug } from "@/lib/slugify";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";

export const dynamic = "force-dynamic";

const PUBLISHED_SPECIALIST_STATUSES = new Set([
  "published_unverified",
  "featured_verified",
  "approved",
  "paused",
]);

/**
 * Guarantee Russian source rows exist in the translation tables for the
 * specialist's profile and active services, so the out-of-band de/uk generator
 * always has a source to translate from.
 *
 * Additive + idempotent: uses ignoreDuplicates so existing translation rows
 * (including any hand-curated ones) are never overwritten. Does NOT call DeepL.
 * Errors are logged but never block publication.
 */
async function ensureRussianSourceTranslations(
  service: ReturnType<typeof createServiceClient>,
  specialistId: string
): Promise<void> {
  try {
    const { data: profile } = await service
      .from("specialist_profiles")
      .select("about_me")
      .eq("specialist_id", specialistId)
      .maybeSingle();

    const aboutMe =
      typeof profile?.about_me === "string" ? profile.about_me.trim() : "";
    if (aboutMe) {
      const { error: profileTranslationError } = await service
        .from("specialist_profile_translations")
        .upsert(
          { specialist_id: specialistId, language_code: "ru", about_me: aboutMe },
          { onConflict: "specialist_id,language_code", ignoreDuplicates: true }
        );
      if (profileTranslationError) {
        console.error(
          "[specialist/dashboard/publish] ensure ru profile translation failed",
          profileTranslationError
        );
      }
    }

    const { data: services } = await service
      .from("specialist_services")
      .select("id, title, description, price_comment, is_active")
      .eq("specialist_id", specialistId)
      .eq("is_active", true);

    const rows = (services ?? [])
      .filter(
        (s) => typeof s.title === "string" && s.title.trim().length > 0
      )
      .map((s) => ({
        specialist_service_id: String(s.id),
        language_code: "ru",
        title: (s.title as string).trim(),
        description:
          typeof s.description === "string" && s.description.trim()
            ? s.description.trim()
            : null,
        price_comment:
          typeof s.price_comment === "string" && s.price_comment.trim()
            ? s.price_comment.trim()
            : null,
      }));

    if (rows.length > 0) {
      const { error: serviceTranslationError } = await service
        .from("specialist_service_translations")
        .upsert(rows, {
          onConflict: "specialist_service_id,language_code",
          ignoreDuplicates: true,
        });
      if (serviceTranslationError) {
        console.error(
          "[specialist/dashboard/publish] ensure ru service translations failed",
          serviceTranslationError
        );
      }
    }
  } catch (err) {
    console.error(
      "[specialist/dashboard/publish] ensureRussianSourceTranslations crashed",
      err
    );
  }
}

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonNoStore({ error: "Not authenticated" }, { status: 401 });
  }

  // All reads/writes go through the service-role client. Ownership is enforced
  // explicitly: the specialist is resolved by user_id = auth.uid() and every
  // operation (including the privileged publish status transition) is scoped to
  // that specialist.id.
  const service = createServiceClient();

  const { data: specialist, error: specialistError } = await service
    .from("specialists")
    .select("id, slug, status, name, category_id, languages, work_format, postal_code")
    .eq("user_id", user.id)
    .maybeSingle();
  if (specialistError || !specialist?.id) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const specialistId = specialist.id as string;
  const currentStatus = typeof specialist.status === "string" ? specialist.status : null;

  if (currentStatus && PUBLISHED_SPECIALIST_STATUSES.has(currentStatus)) {
    return jsonNoStore({
      success: true,
      status: currentStatus,
      alreadyPublished: true,
    });
  }

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

  const { data: category } = await service
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

  const { data: services, error: servicesCheckError } = await service
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
      const { data: cat } = await service
        .from("categories")
        .select("slug")
        .eq("id", specialist.category_id)
        .maybeSingle();
      categorySlug = cat?.slug ?? null;
    }

    let citySlug: string | null = null;

    if (specialist.postal_code) {
      const { data: cityRow } = await service
        .from("cities")
        .select("slug")
        .eq("postal_code", specialist.postal_code)
        .maybeSingle();
      citySlug = cityRow?.slug ?? null;
    }

    if (!citySlug) {
      const { data: profile } = await service
        .from("specialist_profiles")
        .select("city")
        .eq("specialist_id", specialistId)
        .maybeSingle();
      if (profile?.city) {
        const { data: cityRow } = await service
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
        const { data: existing } = await service
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

  const { data: updated, error: updateError } = await service
    .from("specialists")
    .update(updatePayload)
    .eq("id", specialistId)
    .not("status", "in", "(published_unverified,featured_verified,approved,paused)")
    .select("id, status")
    .maybeSingle();
  if (updateError) {
    return jsonNoStore({ error: "Failed to publish specialist profile" }, { status: 500 });
  }

  if (!updated) {
    const { data: current } = await service
      .from("specialists")
      .select("status")
      .eq("id", specialistId)
      .maybeSingle();
    const status = typeof current?.status === "string" ? current.status : "published_unverified";
    return jsonNoStore({
      success: true,
      status,
      alreadyPublished: true,
    });
  }

  // Publish succeeded for the first time — guarantee ru-source translation rows
  // so the out-of-band de/uk generator always has a source. Non-blocking.
  await ensureRussianSourceTranslations(service, specialistId);

  const { data: publishedRow } = await service
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

  const { error: founderRpcError } = await service.rpc("try_assign_founder_badge", {
    p_specialist_id: specialistId,
  });
  if (founderRpcError) {
    console.warn("[specialist/dashboard/publish] try_assign_founder_badge:", founderRpcError.message);
  }

  return jsonNoStore({ success: true, status: updated.status });
}
