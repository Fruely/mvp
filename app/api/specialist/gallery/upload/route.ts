import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import {
  buildGalleryLimitError,
  canAddGalleryImage,
  normalizeGalleryUrls,
  resolveSpecialistEntitlements,
} from "@/lib/billing/planEntitlements";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";

export const dynamic = "force-dynamic";

const BUCKET = "specialist-avatars";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();
    const { data: specialist, error: specialistError } = await service
      .from("specialists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (specialistError) {
      console.error("[specialist/gallery/upload] specialists lookup error:", specialistError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    if (!specialist?.id) {
      return NextResponse.json({ error: "specialist_not_found" }, { status: 404 });
    }

    const plan = await getSpecialistPlanForDashboard(service, specialist.id);
    const entitlements = resolveSpecialistEntitlements(plan);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "invalid_file" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }

    const { data: existingProfile, error: profileLookupError } = await service
      .from("specialist_profiles")
      .select("specialist_id")
      .eq("specialist_id", specialist.id)
      .maybeSingle();
    if (profileLookupError) {
      console.error("[specialist/gallery/upload] profile lookup error:", profileLookupError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    if (!existingProfile?.specialist_id) {
      const { error: profileCreateError } = await service.from("specialist_profiles").insert({
        specialist_id: specialist.id,
        created_at: new Date().toISOString(),
      });
      if (profileCreateError) {
        console.error("[specialist/gallery/upload] profile create error:", profileCreateError);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    }

    const { data: profile } = await service
      .from("specialist_profiles")
      .select("gallery_urls")
      .eq("specialist_id", specialist.id)
      .maybeSingle();
    const currentGallery = normalizeGalleryUrls(profile?.gallery_urls);

    if (!canAddGalleryImage(currentGallery.length, entitlements.galleryLimit)) {
      return NextResponse.json(
        buildGalleryLimitError(entitlements, currentGallery.length),
        { status: 409 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const path = `${specialist.id}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;

    const { data: uploaded, error: uploadError } = await service.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      if (uploadError.message?.includes("Bucket not found")) {
        return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
      }
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }

    const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(uploaded.path);
    return NextResponse.json({ url: urlData.publicUrl }, { status: 200 });
  } catch (error) {
    console.error("[specialist/gallery/upload] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
