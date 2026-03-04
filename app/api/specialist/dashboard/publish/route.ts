import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { jsonNoStore } from "@/lib/api/response";

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
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (specialistError || !specialist?.id) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const specialistId = specialist.id as string;

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select("photo_url")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  const { data: specialistServices } = await supabase
    .from("specialist_services")
    .select("id, title, price_from, is_active")
    .eq("specialist_id", specialistId);

  const hasPhoto = Boolean(typeof profile?.photo_url === "string" && profile.photo_url.trim().length > 0);
  const { data: specialistMain } = await supabase
    .from("specialists")
    .select("name")
    .eq("id", specialistId)
    .single();
  const hasName = Boolean(typeof specialistMain?.name === "string" && specialistMain.name.trim().length > 0);
  const hasService = (specialistServices ?? []).some(
    (service) => typeof service.title === "string" && service.title.trim().length > 0
  );
  const hasPrice = (specialistServices ?? []).some(
    (service) =>
      service.is_active === true &&
      typeof service.price_from === "number" &&
      Number.isFinite(service.price_from) &&
      service.price_from > 0
  );

  if (!hasPhoto || !hasName || !hasService || !hasPrice) {
    return jsonNoStore(
      { error: "Для публикации нужно заполнить фото, имя, минимум одну услугу и цену." },
      { status: 400 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("specialists")
    .update({
      status: "published_unverified",
      is_active: true,
      is_visible: true,
      published_at: new Date().toISOString(),
    })
    .eq("id", specialistId)
    .select("id, status")
    .single();
  if (updateError) {
    return jsonNoStore({ error: "Failed to publish specialist profile" }, { status: 500 });
  }

  return jsonNoStore({ success: true, status: updated.status });
}
