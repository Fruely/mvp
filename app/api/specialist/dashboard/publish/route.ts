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
    .select("id, status, name, category_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (specialistError || !specialist?.id) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const specialistId = specialist.id as string;

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select("photo_url, city, about_me")
    .eq("specialist_id", specialistId)
    .maybeSingle();
  const hasName = Boolean(typeof specialist.name === "string" && specialist.name.trim().length > 0);
  const hasCategory = Boolean(
    typeof specialist.category_id === "string" && specialist.category_id.trim().length > 0
  );
  const hasCity = Boolean(typeof profile?.city === "string" && profile.city.trim().length > 0);
  const hasDescription = Boolean(
    typeof profile?.about_me === "string" && profile.about_me.trim().length > 0
  );
  const hasAvatar = Boolean(
    typeof profile?.photo_url === "string" && profile.photo_url.trim().length > 0
  );

  const missing: string[] = [];
  if (!hasName) missing.push("Имя");
  if (!hasCategory) missing.push("Категория");
  if (!hasCity) missing.push("Город / локация");
  if (!hasDescription) missing.push("Описание");
  if (!hasAvatar) missing.push("Аватар");

  if (!hasName || !hasCategory || !hasCity || !hasDescription || !hasAvatar) {
    return jsonNoStore({ error: "Заполните обязательные поля", fields: missing }, { status: 400 });
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
