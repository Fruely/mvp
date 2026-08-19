import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "specialist-avatars";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

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
    const { data: specialist, error: specError } = await supabase
      .from("specialists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (specError) {
      console.error("[specialist/avatar/upload] specialists lookup error:", specError);
      return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }

    if (!specialist?.id) {
      return NextResponse.json(
        { error: "Профиль специалиста не найден" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Выберите файл изображения" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Допустимы только изображения: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Размер файла не более 5 МБ" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${specialist.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("specialist_profiles")
      .select("specialist_id")
      .eq("specialist_id", specialist.id)
      .maybeSingle();
    if (profileLookupError) {
      console.error("[specialist/avatar/upload] profile lookup error:", profileLookupError);
      return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }

    if (!existingProfile?.specialist_id) {
      const { error: profileCreateError } = await supabase.from("specialist_profiles").insert({
        specialist_id: specialist.id,
        created_at: new Date().toISOString(),
      });
      if (profileCreateError) {
        console.error("[specialist/avatar/upload] profile create error:", profileCreateError);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
      }
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message?.includes("Bucket not found")) {
        return NextResponse.json(
          {
            error:
              "Хранилище для аватаров не настроено. Обратитесь к администратору.",
          },
          { status: 503 }
        );
      }
      console.error("[specialist/avatar/upload] Storage error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Ошибка загрузки" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
    const publicUrl = urlData.publicUrl;

    await supabase
      .from("specialist_profiles")
      .update({ photo_url: publicUrl, photo_focus: null })
      .eq("specialist_id", specialist.id);

    await supabase
      .from("specialists")
      .update({ avatar_url: publicUrl })
      .eq("id", specialist.id);

    return NextResponse.json({ url: publicUrl, avatar_url: publicUrl }, { status: 200 });
  } catch (err) {
    console.error("[specialist/avatar/upload] Unexpected error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
