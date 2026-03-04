import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { jsonNoStore } from "@/lib/api/response";

type Payload = {
  name?: string;
  phone?: string;
  work_format?: "online" | "offline" | "hybrid";
  languages?: string[];
  city?: string;
  about_me?: string;
  photo_url?: string;
  gallery_urls?: string[];
  services?: Array<{
    id?: string;
    title: string;
    price_from: string;
    currency?: string;
    is_active?: boolean;
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

  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (specialistError || !specialist?.id) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const specialistId = specialist.id as string;
  const languages = Array.isArray(body.languages)
    ? body.languages.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const specialistPatch: Record<string, unknown> = {};
  if (typeof body.name === "string") specialistPatch.name = body.name.trim() || null;
  if (typeof body.phone === "string") specialistPatch.phone = body.phone.trim() || null;
  if (body.work_format === "online" || body.work_format === "offline" || body.work_format === "hybrid") {
    specialistPatch.work_format = body.work_format;
  }
  specialistPatch.languages = languages;

  const { error: specialistPatchError } = await supabase
    .from("specialists")
    .update(specialistPatch)
    .eq("id", specialistId);
  if (specialistPatchError) {
    return jsonNoStore({ error: "Failed to update specialist profile" }, { status: 500 });
  }

  const profilePatch = {
    about_me: typeof body.about_me === "string" ? body.about_me.trim() || null : null,
    city: typeof body.city === "string" ? body.city.trim() || null : null,
    photo_url: typeof body.photo_url === "string" ? body.photo_url.trim() || null : null,
    gallery_urls: Array.isArray(body.gallery_urls)
      ? body.gallery_urls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
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
          price_from: Number(service.price_from),
          currency:
            typeof service.currency === "string" && service.currency.trim().length > 0
              ? service.currency.trim().toUpperCase()
              : "EUR",
          is_active: service.is_active !== false,
        }))
        .filter((service) => Number.isFinite(service.price_from) && service.price_from >= 0)
    : [];

  const { data: existingServices } = await supabase
    .from("specialist_services")
    .select("id")
    .eq("specialist_id", specialistId);

  const existingIds = new Set((existingServices ?? []).map((service) => service.id as string));
  const keepIds = new Set<string>();

  for (const service of normalizedServices) {
    if (service.id && existingIds.has(service.id)) {
      keepIds.add(service.id);
      const { error } = await supabase
        .from("specialist_services")
        .update({
          title: service.title,
          pricing_type: "fixed",
          price_from: service.price_from,
          price_to: null,
          currency: service.currency,
          is_active: service.is_active,
        })
        .eq("id", service.id)
        .eq("specialist_id", specialistId);
      if (error) return jsonNoStore({ error: "Failed to update services" }, { status: 500 });
    } else {
      const { data, error } = await supabase
        .from("specialist_services")
        .insert({
          specialist_id: specialistId,
          title: service.title,
          pricing_type: "fixed",
          price_from: service.price_from,
          price_to: null,
          currency: service.currency,
          is_active: service.is_active,
        })
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
