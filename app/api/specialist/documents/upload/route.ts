import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "specialist-avatars";
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_IMAGES = 10;
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

    const service = createServiceClient();
    const { data: specialist, error: specialistError } = await service
      .from("specialists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (specialistError) {
      console.error("[specialist/documents/upload] specialists lookup error:", specialistError);
      return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
    if (!specialist?.id) {
      return NextResponse.json({ error: "Профиль специалиста не найден" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Выберите файл изображения" }, { status: 400 });
    }
    if (file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Для документов допустимы только изображения (JPEG, PNG, WebP)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Допустимы только изображения: JPEG, PNG, WebP" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Размер файла не более 5 МБ" }, { status: 400 });
    }

    const { data: existingProfile, error: profileLookupError } = await service
      .from("specialist_profiles")
      .select("specialist_id")
      .eq("specialist_id", specialist.id)
      .maybeSingle();
    if (profileLookupError) {
      console.error("[specialist/documents/upload] profile lookup error:", profileLookupError);
      return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
    }
    if (!existingProfile?.specialist_id) {
      const { error: profileCreateError } = await service.from("specialist_profiles").insert({
        specialist_id: specialist.id,
        created_at: new Date().toISOString(),
      });
      if (profileCreateError) {
        console.error("[specialist/documents/upload] profile create error:", profileCreateError);
        return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
      }
    }

    const { data: profile } = await service
      .from("specialist_profiles")
      .select("certificate_urls")
      .eq("specialist_id", specialist.id)
      .maybeSingle();
    const currentDocs = Array.isArray(profile?.certificate_urls)
      ? profile.certificate_urls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    if (currentDocs.length >= MAX_DOCUMENT_IMAGES) {
      return NextResponse.json(
        { error: `Можно загрузить не более ${MAX_DOCUMENT_IMAGES} документов` },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${specialist.id}/documents/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

    const { data: uploaded, error: uploadError } = await service.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      if (uploadError.message?.includes("Bucket not found")) {
        return NextResponse.json({ error: "Хранилище изображений не настроено" }, { status: 503 });
      }
      return NextResponse.json({ error: uploadError.message || "Ошибка загрузки" }, { status: 500 });
    }

    const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(uploaded.path);
    return NextResponse.json({ url: urlData.publicUrl }, { status: 200 });
  } catch (error) {
    console.error("[specialist/documents/upload] unexpected error", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
