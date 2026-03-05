import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "verification_docs";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (specialistError) {
      return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }

    if (!specialist?.id) {
      return NextResponse.json({ error: "Профиль специалиста не найден" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Выберите файл" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Допустимы только JPG, PNG или PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Размер файла не более 10 МБ" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const safeExt = ["jpg", "jpeg", "png", "pdf"].includes(ext) ? ext : "pdf";
    const path = `${specialist.id}/document.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Ошибка загрузки файла" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("specialists")
      .update({ verification_status: "pending" })
      .eq("id", specialist.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Файл загружен, но не удалось обновить статус проверки" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, verification_status: "pending" }, { status: 200 });
  } catch (error) {
    console.error("[specialist/verification/upload] unexpected error", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
