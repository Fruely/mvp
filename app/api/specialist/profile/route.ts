import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidVideoUrl(s: string): boolean {
  if (!isValidHttpUrl(s)) return false;
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("vimeo.com")
    );
  } catch {
    return false;
  }
}

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
    "photo_url",
    "video_url",
    "gallery_urls",
    "certificate_urls",
  ] as const;

  // Build updatePayload ONLY from whitelisted fields
  // Any extra fields in request body are ignored and discarded
  const updatePayload: Record<string, unknown> = {};
  const hasField = (field: (typeof ALLOWED_FIELDS)[number]) =>
    Object.prototype.hasOwnProperty.call(body, field);

  // Handle text fields
  if (hasField("about_me")) {
    updatePayload.about_me = body.about_me ?? null;
  }
  if (hasField("services")) {
    updatePayload.services = body.services ?? null;
  }
  if (hasField("how_i_work")) {
    updatePayload.how_i_work = body.how_i_work ?? null;
  }
  if (hasField("experience")) {
    updatePayload.experience = body.experience ?? null;
  }
  if (hasField("city")) {
    updatePayload.city = body.city ?? null;
  }

  // Handle radius_km (numeric)
  if (hasField("radius_km")) {
    updatePayload.radius_km =
      typeof body.radius_km === "number" && !Number.isNaN(body.radius_km)
        ? body.radius_km
        : null;
  }

  // Handle categories (array)
  if (hasField("categories")) {
    if (Array.isArray(body.categories)) {
      updatePayload.categories = body.categories
        .filter((c: unknown) => typeof c === "string")
        .map((c: string) => c.trim())
        .filter(Boolean);
    } else {
      updatePayload.categories = null;
    }
  }

  // Photo URL (avatar) — any https/http image URL; synced to specialists.avatar_url
  if (Object.prototype.hasOwnProperty.call(body, "photo_url")) {
    const v = body.photo_url;
    if (v == null || v === "") {
      updatePayload.photo_url = null;
    } else if (typeof v === "string" && isValidHttpUrl(v.trim())) {
      updatePayload.photo_url = v.trim();
    } else {
      return Response.json(
        { error: "Укажите корректную ссылку на фото (например https://...)" },
        { status: 400 }
      );
    }
  }

  // Video URL — YouTube or Vimeo only
  if (Object.prototype.hasOwnProperty.call(body, "video_url")) {
    const v = body.video_url;
    if (v == null || v === "") {
      updatePayload.video_url = null;
    } else if (typeof v === "string" && isValidVideoUrl(v.trim())) {
      updatePayload.video_url = v.trim();
    } else {
      return Response.json(
        { error: "Укажите ссылку на YouTube или Vimeo" },
        { status: 400 }
      );
    }
  }

  // Video gallery — array of YouTube/Vimeo URLs
  if (Object.prototype.hasOwnProperty.call(body, "gallery_urls")) {
    if (!Array.isArray(body.gallery_urls)) {
      updatePayload.gallery_urls = null;
    } else {
      const urls = body.gallery_urls
        .filter((u: unknown) => typeof u === "string" && isValidVideoUrl(String(u).trim()))
        .map((u: string) => u.trim());
      updatePayload.gallery_urls = urls.length ? urls : null;
    }
  }

  // Certificate image URLs — array of http/https URLs
  if (Object.prototype.hasOwnProperty.call(body, "certificate_urls")) {
    if (!Array.isArray(body.certificate_urls)) {
      updatePayload.certificate_urls = null;
    } else {
      const urls = body.certificate_urls
        .filter((u: unknown) => typeof u === "string" && isValidHttpUrl(String(u).trim()))
        .map((u: string) => u.trim());
      updatePayload.certificate_urls = urls.length ? urls : null;
    }
  }

  // Update only whitelisted fields
  const { data: profile, error: updateError } = await supabase
    .from("specialist_profiles")
    .update(updatePayload)
    .eq("specialist_id", specialist.id)
    .select(
      "photo_url, video_url, gallery_urls, certificate_urls, about_me, services, how_i_work, experience, city, radius_km, categories"
    )
    .maybeSingle();

  if (updateError) {
    console.error("[specialist profile] update error", updateError);
    return Response.json(
      { error: "Не удалось сохранить профиль" },
      { status: 400 }
    );
  }

  // Sync avatar to specialists so public card and category lists show it
  if (Object.prototype.hasOwnProperty.call(updatePayload, "photo_url")) {
    await supabase
      .from("specialists")
      .update({ avatar_url: updatePayload.photo_url ?? null })
      .eq("id", specialist.id);
  }

  return Response.json({ data: profile }, { status: 200 });
}

