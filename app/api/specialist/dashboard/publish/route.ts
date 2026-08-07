import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { notify } from "@/lib/notifications/notify";
import {
  formatCategoryNotifyBlock,
  formatGeographyNotifyBlock,
  formatSpecialistPublishNotifyDetails,
  type CategoryTitleRow,
} from "@/lib/notifications/specialistPublishNotify";
import { buildSpecialistSlug } from "@/lib/slugify";
import {
  reconcileSpecialistAccess,
  isLifecycleReconciliationEnabled,
} from "@/lib/billing/specialistAccessLifecycle";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { validatePublication } from "@/lib/dashboard/publicationValidator";
import { loadSpecialistGeoSnapshot } from "@/lib/specialists/publicationGeography";
import { publicationGeoErrorMessageRu } from "@/lib/specialists/geography";

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
    .select(
      "id, slug, status, name, category_id, languages, work_format, postal_code, country_code, lat, lng, service_radius_km"
    )
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

  const { data: category } = specialist.category_id
    ? await service
        .from("categories")
        .select("id, parent_id, slug")
        .eq("id", specialist.category_id)
        .maybeSingle()
    : { data: null };

  const { data: services, error: servicesCheckError } = specialist.category_id
    ? await service
        .from("specialist_services")
        .select("title, price_from, is_active")
        .eq("specialist_id", specialistId)
        .eq("category_id", specialist.category_id as string)
        .eq("is_active", true)
    : { data: [], error: null };

  if (servicesCheckError) {
    return jsonNoStore({ error: "Failed to validate services" }, { status: 500 });
  }

  const geo = await loadSpecialistGeoSnapshot(service, specialistId);
  const validation = validatePublication({
    name: typeof specialist.name === "string" ? specialist.name : "",
    categoryId: typeof specialist.category_id === "string" ? specialist.category_id : "",
    categoryParentId: category && typeof category.parent_id === "string" ? category.parent_id : null,
    categorySlug: category && typeof category.slug === "string" ? category.slug : null,
    categoryMissing: Boolean(specialist.category_id) && !category,
    languages: Array.isArray(specialist.languages) ? specialist.languages : [],
    workFormat: typeof specialist.work_format === "string" ? specialist.work_format : null,
    countryCode: geo?.countryCode ?? specialist.country_code,
    postalCode: geo?.postalCode ?? specialist.postal_code,
    city: geo?.city ?? null,
    lat: geo?.lat ?? (typeof specialist.lat === "number" ? specialist.lat : null),
    lng: geo?.lng ?? (typeof specialist.lng === "number" ? specialist.lng : null),
    serviceRadiusKm:
      geo?.serviceRadiusKm ??
      (typeof specialist.service_radius_km === "number" ? specialist.service_radius_km : null),
    servicesInSelectedCategory: services ?? [],
  });

  if (!validation.ready) {
    const first = validation.blocking[0];
    const geoLike = first?.code?.includes("country")
      || first?.code?.includes("postal")
      || first?.code?.includes("city")
      || first?.code?.includes("coordinates")
      || first?.code?.includes("service_radius");
    const error = geoLike
      ? publicationGeoErrorMessageRu(
          first.code === "country_required"
            ? "publication_country_required"
            : first.code === "country_not_supported"
              ? "publication_country_not_supported"
              : first.code === "postal_code_required"
                ? "publication_postal_code_required"
                : first.code === "city_required"
                  ? "publication_city_required"
                  : first.code === "coordinates_required"
                    ? "publication_coordinates_required"
                    : first.code === "service_radius_required"
                      ? "publication_service_radius_required"
                      : first.code === "service_radius_invalid"
                        ? "publication_service_radius_invalid"
                        : "publication_coordinates_required",
          specialist.work_format
        )
      : first?.code === "category_uncategorized"
        ? "Нельзя опубликовать профиль с категорией «Другое». Выберите категорию каталога или дождитесь решения администратора."
        : first?.code === "services_required"
          ? "Добавьте хотя бы одну услугу с ценой больше 0"
          : "Заполните обязательные поля";

    return jsonNoStore(
      {
        error,
        code: first?.code ?? "publication_incomplete",
        issues: validation.blocking,
      },
      { status: 400 }
    );
  }

  if (!category) {
    return jsonNoStore({ error: "Invalid category" }, { status: 400 });
  }
  if (category.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG) {
    return jsonNoStore(
      {
        error:
          "Нельзя опубликовать профиль с категорией «Другое». Выберите категорию каталога или дождитесь решения администратора.",
        issues: validation.blocking,
      },
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

    // Production `cities` has name/slug only (no postal_code column).
    const { data: profile } = await service
      .from("specialist_profiles")
      .select("city")
      .eq("specialist_id", specialistId)
      .maybeSingle();
    if (profile?.city) {
      const { data: cityRow } = await service
        .from("cities")
        .select("slug")
        .ilike("name", profile.city)
        .eq("is_active", true)
        .maybeSingle();
      citySlug = cityRow?.slug ?? null;
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
    .select(
      "id, name, slug, status, category_id, work_format, postal_code, country_code, lat, lng, service_radius_km, published_at, is_active, is_visible"
    )
    .eq("id", specialistId)
    .maybeSingle();

  if (
    publishedRow &&
    (publishedRow.published_at ||
      (publishedRow.is_active === true && publishedRow.is_visible === true))
  ) {
    let notifyDetails: string | null = null;
    try {
      const categoryId =
        typeof publishedRow.category_id === "string" ? publishedRow.category_id : null;
      let selected: CategoryTitleRow | null = null;
      let parent: CategoryTitleRow | null = null;
      let loadError: string | null = null;
      if (categoryId) {
        const { data: cat, error: catErr } = await service
          .from("categories")
          .select("id, parent_id, slug, title, title_ru, title_ua, title_de")
          .eq("id", categoryId)
          .maybeSingle();
        if (catErr) {
          loadError = catErr.message;
          console.error("[publish] category notify lookup failed", catErr);
        } else {
          selected = (cat as CategoryTitleRow | null) ?? null;
        }
        if (selected?.parent_id) {
          const { data: parentRow } = await service
            .from("categories")
            .select("id, parent_id, slug, title, title_ru, title_ua, title_de")
            .eq("id", selected.parent_id)
            .maybeSingle();
          parent = (parentRow as CategoryTitleRow | null) ?? null;
        }
      }
      const { data: profile } = await service
        .from("specialist_profiles")
        .select("city")
        .eq("specialist_id", specialistId)
        .maybeSingle();

      notifyDetails = formatSpecialistPublishNotifyDetails({
        categoryBlock: formatCategoryNotifyBlock({
          categoryId,
          selected,
          parent,
          loadError,
        }),
        geographyBlock: formatGeographyNotifyBlock({
          workFormat: publishedRow.work_format,
          postalCode: publishedRow.postal_code,
          city: profile?.city,
          countryCode: publishedRow.country_code,
          lat: publishedRow.lat,
          lng: publishedRow.lng,
          serviceRadiusKm: publishedRow.service_radius_km,
        }),
        slug:
          (typeof publishedRow.slug === "string" && publishedRow.slug) ||
          generatedSlug ||
          (typeof specialist.slug === "string" ? specialist.slug : null),
        status:
          (typeof publishedRow.status === "string" && publishedRow.status) ||
          (typeof updated.status === "string" ? updated.status : null),
        siteUrl:
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.APP_URL ||
          "https://freuly.de",
      });
    } catch (err) {
      console.error("[publish] notify details crashed", err);
    }

    try {
      await notify("NEW_SPECIALIST", {
        name: `🟢 Опубликовался: ${publishedRow.name || "Без имени"}`,
        details: notifyDetails,
      });
    } catch (err) {
      console.error("[publish] Telegram notify failed after publish", err);
    }
  }

  const { error: founderRpcError } = await service.rpc("try_assign_founder_badge", {
    p_specialist_id: specialistId,
  });
  if (founderRpcError) {
    console.warn("[specialist/dashboard/publish] try_assign_founder_badge:", founderRpcError.message);
  }

  if (isLifecycleReconciliationEnabled()) {
    try {
      const nowIso = new Date().toISOString();
      const { data: existingPlan } = await service
        .from("specialist_plan")
        .select("specialist_id, lifecycle_enrolled_at")
        .eq("specialist_id", specialistId)
        .maybeSingle();

      if (!existingPlan) {
        await service.from("specialist_plan").insert({
          specialist_id: specialistId,
          plan_code: "starter",
          plan_status: "active",
          started_at: nowIso,
          lifecycle_enrolled_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        });
      } else if (!existingPlan.lifecycle_enrolled_at) {
        await service
          .from("specialist_plan")
          .update({ lifecycle_enrolled_at: nowIso, updated_at: nowIso })
          .eq("specialist_id", specialistId);
      }

      await reconcileSpecialistAccess(service, specialistId);
    } catch (err) {
      console.error("[specialist/dashboard/publish] lifecycle enrollment failed", err);
    }
  }

  return jsonNoStore({ success: true, status: updated.status });
}
