import type { SupabaseClient } from "@supabase/supabase-js";

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
import { isPublishedSpecialistStatus } from "@/lib/specialistDashboard/publicationStatus";

export type PublishSpecialistSuccess = {
  ok: true;
  status: string;
  alreadyPublished?: boolean;
};

export type PublishSpecialistFailure = {
  ok: false;
  status: number;
  body: Record<string, unknown>;
};

export type PublishSpecialistResult = PublishSpecialistSuccess | PublishSpecialistFailure;

export type PublishSpecialistDependencies = {
  notifyNewSpecialist?: (args: { specialistId: string; name: string | null }) => Promise<void>;
  assignFounderBadge?: (specialistId: string) => Promise<void>;
  reconcileLifecycle?: (specialistId: string) => Promise<void>;
};

type SpecialistPublishRow = {
  id: string;
  slug: string | null;
  status: string | null;
  name: string | null;
  category_id: string | null;
  languages: unknown;
  work_format: string | null;
  postal_code: string | null;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  service_radius_km: number | null;
};

async function ensureRussianSourceTranslations(
  service: SupabaseClient,
  specialistId: string,
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
          { onConflict: "specialist_id,language_code", ignoreDuplicates: true },
        );
      if (profileTranslationError) {
        console.error(
          "[specialistDashboard/publish] ensure ru profile translation failed",
          profileTranslationError,
        );
      }
    }

    const { data: services } = await service
      .from("specialist_services")
      .select("id, title, description, price_comment, is_active")
      .eq("specialist_id", specialistId)
      .eq("is_active", true);

    const rows = (services ?? [])
      .filter((s) => typeof s.title === "string" && s.title.trim().length > 0)
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
          "[specialistDashboard/publish] ensure ru service translations failed",
          serviceTranslationError,
        );
      }
    }
  } catch (err) {
    console.error("[specialistDashboard/publish] ensureRussianSourceTranslations crashed", err);
  }
}

function buildValidationErrorBody(
  specialist: SpecialistPublishRow,
  validation: ReturnType<typeof validatePublication>,
): Record<string, unknown> {
  const first = validation.blocking[0];
  const geoLike =
    first?.code?.includes("country") ||
    first?.code?.includes("postal") ||
    first?.code?.includes("city") ||
    first?.code?.includes("coordinates") ||
    first?.code?.includes("service_radius");
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
        specialist.work_format,
      )
    : first?.code === "category_uncategorized"
      ? "Нельзя опубликовать профиль с категорией «Другое». Выберите категорию каталога или дождитесь решения администратора."
      : first?.code === "services_required"
        ? "Добавьте хотя бы одну услугу с ценой больше 0"
        : "Заполните обязательные поля";

  return {
    error,
    code: first?.code ?? "publication_incomplete",
    issues: validation.blocking,
  };
}

export async function publishSpecialistProfile(
  service: SupabaseClient,
  specialistId: string,
  deps: PublishSpecialistDependencies = {},
): Promise<PublishSpecialistResult> {
  const notifyNewSpecialist =
    deps.notifyNewSpecialist ??
    (async (args: { specialistId: string; name: string | null }) => {
      const { data: publishedRow } = await service
        .from("specialists")
        .select(
          "id, name, slug, status, category_id, work_format, postal_code, country_code, lat, lng, service_radius_km, published_at, is_active, is_visible",
        )
        .eq("id", args.specialistId)
        .maybeSingle();

      if (
        !publishedRow ||
        !(
          publishedRow.published_at ||
          (publishedRow.is_active === true && publishedRow.is_visible === true)
        )
      ) {
        return;
      }

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
          .eq("specialist_id", args.specialistId)
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
          slug: typeof publishedRow.slug === "string" ? publishedRow.slug : null,
          status: typeof publishedRow.status === "string" ? publishedRow.status : null,
          siteUrl:
            process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.APP_URL ||
            "https://freuly.de",
        });
      } catch (err) {
        console.error("[specialistDashboard/publish] notify details crashed", err);
      }

      await notify("NEW_SPECIALIST", {
        name: `🟢 Опубликовался: ${args.name || "Без имени"}`,
        details: notifyDetails,
      });
    });

  const assignFounderBadge =
    deps.assignFounderBadge ??
    (async (id: string) => {
      const { error } = await service.rpc("try_assign_founder_badge", {
        p_specialist_id: id,
      });
      if (error) {
        console.warn("[specialistDashboard/publish] try_assign_founder_badge:", error.message);
      }
    });

  const reconcileLifecycle =
    deps.reconcileLifecycle ??
    (async (id: string) => {
      if (!isLifecycleReconciliationEnabled()) return;
      try {
        const nowIso = new Date().toISOString();
        const { data: existingPlan } = await service
          .from("specialist_plan")
          .select("specialist_id, lifecycle_enrolled_at")
          .eq("specialist_id", id)
          .maybeSingle();

        if (!existingPlan) {
          await service.from("specialist_plan").insert({
            specialist_id: id,
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
            .eq("specialist_id", id);
        }

        await reconcileSpecialistAccess(service, id);
      } catch (err) {
        console.error("[specialistDashboard/publish] lifecycle enrollment failed", err);
      }
    });
  const { data: specialist, error: specialistError } = await service
    .from("specialists")
    .select(
      "id, slug, status, name, category_id, languages, work_format, postal_code, country_code, lat, lng, service_radius_km",
    )
    .eq("id", specialistId)
    .maybeSingle();

  if (specialistError || !specialist?.id) {
    return { ok: false, status: 404, body: { error: "specialist_not_found" } };
  }

  const row = specialist as SpecialistPublishRow;
  const currentStatus = typeof row.status === "string" ? row.status : null;

  if (isPublishedSpecialistStatus(currentStatus)) {
    return {
      ok: true,
      status: currentStatus ?? "published_unverified",
      alreadyPublished: true,
    };
  }

  const { data: category } = row.category_id
    ? await service
        .from("categories")
        .select("id, parent_id, slug")
        .eq("id", row.category_id)
        .maybeSingle()
    : { data: null };

  const { data: services, error: servicesCheckError } = row.category_id
    ? await service
        .from("specialist_services")
        .select("title, price_from, is_active")
        .eq("specialist_id", specialistId)
        .eq("category_id", row.category_id as string)
        .eq("is_active", true)
    : { data: [], error: null };

  if (servicesCheckError) {
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const geo = await loadSpecialistGeoSnapshot(service, specialistId);
  const validation = validatePublication({
    name: typeof row.name === "string" ? row.name : "",
    categoryId: typeof row.category_id === "string" ? row.category_id : "",
    categoryParentId: category && typeof category.parent_id === "string" ? category.parent_id : null,
    categorySlug: category && typeof category.slug === "string" ? category.slug : null,
    categoryMissing: Boolean(row.category_id) && !category,
    languages: Array.isArray(row.languages) ? row.languages : [],
    workFormat: typeof row.work_format === "string" ? row.work_format : null,
    countryCode: geo?.countryCode ?? row.country_code,
    postalCode: geo?.postalCode ?? row.postal_code,
    city: geo?.city ?? null,
    lat: geo?.lat ?? (typeof row.lat === "number" ? row.lat : null),
    lng: geo?.lng ?? (typeof row.lng === "number" ? row.lng : null),
    serviceRadiusKm:
      geo?.serviceRadiusKm ??
      (typeof row.service_radius_km === "number" ? row.service_radius_km : null),
    servicesInSelectedCategory: services ?? [],
  });

  if (!validation.ready) {
    return {
      ok: false,
      status: 400,
      body: buildValidationErrorBody(row, validation),
    };
  }

  if (!category) {
    return { ok: false, status: 400, body: { error: "Invalid category" } };
  }
  if (category.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG) {
    return {
      ok: false,
      status: 400,
      body: {
        error:
          "Нельзя опубликовать профиль с категорией «Другое». Выберите категорию каталога или дождитесь решения администратора.",
        issues: validation.blocking,
      },
    };
  }

  let generatedSlug: string | null = null;

  if (!row.slug) {
    let categorySlug: string | null = null;
    if (row.category_id) {
      const { data: cat } = await service
        .from("categories")
        .select("slug")
        .eq("id", row.category_id)
        .maybeSingle();
      categorySlug = cat?.slug ?? null;
    }

    let citySlug: string | null = null;
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

    if (row.name) {
      const base = buildSpecialistSlug(categorySlug, citySlug, row.name);
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
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  if (!updated) {
    const { data: current } = await service
      .from("specialists")
      .select("status")
      .eq("id", specialistId)
      .maybeSingle();
    const status = typeof current?.status === "string" ? current.status : "published_unverified";
    return { ok: true, status, alreadyPublished: true };
  }

  await ensureRussianSourceTranslations(service, specialistId);

  const { data: publishedRow } = await service
    .from("specialists")
    .select(
      "id, name, slug, status, category_id, work_format, postal_code, country_code, lat, lng, service_radius_km, published_at, is_active, is_visible",
    )
    .eq("id", specialistId)
    .maybeSingle();

  await notifyNewSpecialist({
    specialistId,
    name: typeof publishedRow?.name === "string" ? publishedRow.name : row.name,
  });
  await assignFounderBadge(specialistId);
  await reconcileLifecycle(specialistId);

  const status = typeof updated.status === "string" ? updated.status : "published_unverified";
  return { ok: true, status };
}
