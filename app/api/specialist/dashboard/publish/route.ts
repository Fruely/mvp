import { NextResponse } from "next/server";
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
    .select("id, status, name, category_id, languages, work_format, postal_code")
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
  if (!specialist.postal_code) missing.push("Почтовый индекс");

  if (missing.length) {
    return NextResponse.json(
      {
        error: "Заполните обязательные поля",
        fields: missing,
      },
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
