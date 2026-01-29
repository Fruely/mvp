import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export async function PUT(request: NextRequest) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (specialistError) {
    console.error("[specialist profile] failed to load specialist", specialistError);
    return Response.json(
      { error: "Не удалось загрузить профиль специалиста" },
      { status: 500 }
    );
  }

  if (!specialist) {
    return Response.json(
      { error: "Профиль специалиста не найден" },
      { status: 404 }
    );
  }

  // Explicit whitelist of allowed fields for profile updates
  // rotation_multiplier is NOT included and must never be readable or writable
  // This field exists in the database but is hidden from specialists and must remain so
  const ALLOWED_FIELDS = [
    "about_me",
    "services",
    "how_i_work",
    "experience",
    "city",
    "radius_km",
    "categories",
  ] as const;

  // Build updatePayload ONLY from whitelisted fields
  // Any extra fields in request body are ignored and discarded
  const updatePayload: Record<string, unknown> = {};

  // Handle text fields
  if (ALLOWED_FIELDS.includes("about_me")) {
    updatePayload.about_me = body.about_me ?? null;
  }
  if (ALLOWED_FIELDS.includes("services")) {
    updatePayload.services = body.services ?? null;
  }
  if (ALLOWED_FIELDS.includes("how_i_work")) {
    updatePayload.how_i_work = body.how_i_work ?? null;
  }
  if (ALLOWED_FIELDS.includes("experience")) {
    updatePayload.experience = body.experience ?? null;
  }
  if (ALLOWED_FIELDS.includes("city")) {
    updatePayload.city = body.city ?? null;
  }

  // Handle radius_km (numeric)
  if (ALLOWED_FIELDS.includes("radius_km")) {
    updatePayload.radius_km =
      typeof body.radius_km === "number" && !Number.isNaN(body.radius_km)
        ? body.radius_km
        : null;
  }

  // Handle categories (array)
  if (ALLOWED_FIELDS.includes("categories")) {
    if (Array.isArray(body.categories)) {
      updatePayload.categories = body.categories
        .filter((c: unknown) => typeof c === "string")
        .map((c: string) => c.trim())
        .filter(Boolean);
    } else {
      updatePayload.categories = null;
    }
  }

  // Update only whitelisted fields
  // Note: rotation_multiplier is explicitly excluded from both select and update
  const { data: profile, error: updateError } = await supabase
    .from("specialist_profiles")
    .update(updatePayload)
    .eq("specialist_id", specialist.id)
    .select(
      "photo_url, video_url, gallery_urls, about_me, services, how_i_work, experience, city, radius_km, categories"
    )
    .maybeSingle();

  if (updateError) {
    console.error("[specialist profile] update error", updateError);
    return Response.json(
      { error: "Не удалось сохранить профиль" },
      { status: 400 }
    );
  }

  return Response.json({ data: profile }, { status: 200 });
}

