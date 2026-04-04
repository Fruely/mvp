import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { jsonNoStore } from "@/lib/api/response";

async function geocodePlz(
  postalCode: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postalCode)}&country=Germany&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Freuly-App" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    if (!Array.isArray(data) || !data[0]?.lat || !data[0]?.lon) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

type Payload = {
  name?: string;
  phone?: string;
  category_id?: string | null;
  work_format?: "online" | "offline" | "hybrid";
  languages?: string[];
  postal_code?: string;
  mobile_service?: boolean;
  service_radius_km?: string;
  city?: string;
  address?: string;
  about_me?: string;
  video_url?: string;
  photo_url?: string;
  gallery_urls?: string[];
  services?: Array<{
    id?: string;
    title: string;
    price_from: string;
    currency?: string;
    is_active?: boolean;
    price_comment?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonNoStore({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Payload | null;
  if (!body) return jsonNoStore({ error: "Invalid payload" }, { status: 400 });

  const allowedLanguages = new Set(["ru", "uk", "de", "en", "pl"]);
  if (!Array.isArray(body.languages)) {
    return jsonNoStore({ error: "Invalid payload: languages must be an array" }, { status: 400 });
  }
  const hasInvalidLanguage = body.languages.some(
    (language) => typeof language !== "string" || !allowedLanguages.has(language)
  );
  if (hasInvalidLanguage) {
    return jsonNoStore({ error: "Invalid payload: languages contains unsupported values" }, { status: 400 });
  }

  if (
    typeof body.work_format !== "undefined" &&
    body.work_format !== "online" &&
    body.work_format !== "offline" &&
    body.work_format !== "hybrid"
  ) {
    return jsonNoStore({ error: "Invalid payload: work_format is not supported" }, { status: 400 });
  }

  if (
    typeof body.postal_code !== "undefined" &&
    body.postal_code !== "" &&
    body.postal_code !== null &&
    (typeof body.postal_code !== "string" || !/^\d{5}$/.test(body.postal_code))
  ) {
    return jsonNoStore({ error: "Invalid payload: postal_code must match /^\\d{5}$/" }, { status: 400 });
  }

  const categoryIdValue = (body as Record<string, unknown>).category_id;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    typeof categoryIdValue !== "undefined" &&
    categoryIdValue !== null &&
    (typeof categoryIdValue !== "string" || !uuidRegex.test(categoryIdValue))
  ) {
    return jsonNoStore({ error: "Invalid payload: category_id must be a UUID" }, { status: 400 });
  }

  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("id, category_id, postal_code, lat, lng")
    .eq("user_id", user.id)
    .maybeSingle();

  if (specialistError || !specialist?.id) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const specialistId = specialist.id as string;
  const effectiveCategoryId =
    body.category_id !== undefined
      ? (typeof body.category_id === "string" ? body.category_id.trim() || null : null)
      : (typeof specialist.category_id === "string" ? specialist.category_id : null) ?? null;
  const languages = Array.isArray(body.languages)
    ? body.languages.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (effectiveCategoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id, parent_id")
      .eq("id", effectiveCategoryId)
      .maybeSingle();
    if (!category || !category.parent_id) {
      return jsonNoStore(
        { error: "Invalid category: parent category cannot be selected" },
        { status: 400 }
      );
    }
  }

  const specialistPatch: Record<string, unknown> = {};
  if (typeof body.name === "string") specialistPatch.name = body.name.trim() || null;
  if (typeof body.phone === "string") specialistPatch.phone = body.phone.trim() || null;
  if (body.category_id === null) {
    specialistPatch.category_id = null;
  } else if (typeof body.category_id === "string") {
    specialistPatch.category_id = body.category_id.trim() || null;
  }
  if (body.work_format === "online" || body.work_format === "offline" || body.work_format === "hybrid") {
    specialistPatch.work_format = body.work_format;
  }
  if (typeof body.postal_code === "string") {
    specialistPatch.postal_code = body.postal_code.trim() || null;
  }

  if (typeof body.mobile_service === "boolean") {
    specialistPatch.mobile_service = body.mobile_service;
  }

  if (typeof body.service_radius_km !== "undefined") {
    const raw = String(body.service_radius_km ?? "").trim();
    if (raw === "") {
      specialistPatch.service_radius_km = null;
    } else {
      const n = Number(raw);
      specialistPatch.service_radius_km = Number.isFinite(n) && n > 0 ? n : null;
    }
  }

  const avatarUrlValue = (body as Record<string, unknown>).avatar_url;
  if (typeof avatarUrlValue === "string") {
    specialistPatch.avatar_url = avatarUrlValue.trim() || null;
  }

  specialistPatch.languages = Array.isArray(languages) ? languages : [];
  specialistPatch.updated_at = new Date().toISOString();

  if (specialistPatch.postal_code) {
    const plz = String(specialistPatch.postal_code);

    if (!/^\d{5}$/.test(plz)) {
      return NextResponse.json(
        { error: "Invalid postal code" },
        { status: 400 }
      );
    }
  }

  // Geocode postal_code → lat/lng when postal_code is new or changed, or coords are missing
  const newPlz =
    typeof specialistPatch.postal_code === "string"
      ? (specialistPatch.postal_code as string)
      : null;
  const oldPlz =
    typeof specialist.postal_code === "string" ? specialist.postal_code : null;
  const plzChanged = newPlz !== null && newPlz !== oldPlz;
  const coordsMissing =
    (newPlz ?? oldPlz) !== null &&
    (specialist.lat == null || specialist.lng == null);

  if (plzChanged || coordsMissing) {
    const plzToGeocode = newPlz ?? oldPlz;
    if (plzToGeocode) {
      const coords = await geocodePlz(plzToGeocode);
      if (coords) {
        specialistPatch.lat = coords.lat;
        specialistPatch.lng = coords.lng;
      }
    }
  }

  const cleanedPatch = Object.fromEntries(
    Object.entries(specialistPatch).filter(([_, v]) => v !== undefined)
  );

  const { error: specialistPatchError } = await supabase
    .from("specialists")
    .update(cleanedPatch)
    .eq("id", specialistId);
  if (specialistPatchError) {
    return jsonNoStore({ error: "Failed to update specialist profile" }, { status: 500 });
  }

  const profilePatch = {
    about_me: typeof body.about_me === "string" ? body.about_me.trim() || null : null,
    city: typeof body.city === "string" ? body.city.trim() || null : null,
    address: typeof body.address === "string" ? body.address.trim() || null : null,
    video_url: typeof body.video_url === "string" ? body.video_url.trim() || null : null,
    photo_url: typeof body.photo_url === "string" ? body.photo_url.trim() || null : null,
    gallery_urls: Array.isArray(body.gallery_urls)
      ? body.gallery_urls
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .slice(0, 5)
      : [],
  };

  const { data: existingProfile } = await supabase
    .from("specialist_profiles")
    .select("specialist_id")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (existingProfile?.specialist_id) {
    const { error } = await supabase
      .from("specialist_profiles")
      .update(profilePatch)
      .eq("specialist_id", specialistId);
    if (error) return jsonNoStore({ error: "Failed to update specialist details" }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("specialist_profiles")
      .insert({ specialist_id: specialistId, ...profilePatch });
    if (error) return jsonNoStore({ error: "Failed to create specialist details" }, { status: 500 });
  }

  const normalizedServices = Array.isArray(body.services)
    ? body.services
        .filter((service) => service && typeof service.title === "string" && service.title.trim().length > 0)
        .map((service) => ({
          id: typeof service.id === "string" ? service.id : null,
          title: service.title.trim(),
          price_from: Number(
            String(service.price_from ?? "").replace(/\s/g, "").replace(",", ".")
          ),
          currency:
            typeof service.currency === "string" && service.currency.trim().length > 0
              ? service.currency.trim().toUpperCase()
              : "EUR",
          is_active: service.is_active !== false,
          price_comment:
            typeof service.price_comment === "string"
              ? (() => {
                  const c = service.price_comment.trim().slice(0, 120);
                  return c.length > 0 ? c : null;
                })()
              : null,
        }))
        .filter((service) => Number.isFinite(service.price_from) && service.price_from >= 0)
    : [];

  if (process.env.NODE_ENV === "development") {
    console.log("SERVICES TO SAVE:", normalizedServices);
  }

  const { data: existingServices } = await supabase
    .from("specialist_services")
    .select("id")
    .eq("specialist_id", specialistId);

  const existingIds = new Set((existingServices ?? []).map((service) => service.id as string));
  const keepIds = new Set<string>();

  for (const service of normalizedServices) {
    if (service.id && existingIds.has(service.id)) {
      keepIds.add(service.id);
      const updatePayload: Record<string, unknown> = {
        title: service.title,
        pricing_type: "fixed",
        price_from: service.price_from,
        price_to: null,
        currency: service.currency,
        is_active: service.is_active,
        price_comment: service.price_comment,
      };
      if (effectiveCategoryId !== null) {
        updatePayload.category_id = effectiveCategoryId;
      }
      const { error } = await supabase
        .from("specialist_services")
        .update(updatePayload)
        .eq("id", service.id)
        .eq("specialist_id", specialistId);
      if (error) return jsonNoStore({ error: "Failed to update services" }, { status: 500 });
    } else {
      const insertPayload: Record<string, unknown> = {
        specialist_id: specialistId,
        title: service.title,
        pricing_type: "fixed",
        price_from: service.price_from,
        price_to: null,
        currency: service.currency,
        is_active: service.is_active,
        price_comment: service.price_comment,
      };
      if (effectiveCategoryId !== null) {
        insertPayload.category_id = effectiveCategoryId;
      }
      const { data, error } = await supabase
        .from("specialist_services")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) return jsonNoStore({ error: "Failed to create services" }, { status: 500 });
      if (data?.id) keepIds.add(String(data.id));
    }
  }

  const idsToDelete = Array.from(existingIds).filter((id) => !keepIds.has(id));
  if (idsToDelete.length > 0) {
    await supabase
      .from("specialist_services")
      .delete()
      .eq("specialist_id", specialistId)
      .in("id", idsToDelete);
  }

  return jsonNoStore({ success: true });
}
