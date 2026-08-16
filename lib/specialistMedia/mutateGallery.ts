import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import {
  buildGalleryLimitError,
  canAddGalleryImage,
  normalizeGalleryUrls,
  resolveSpecialistEntitlements,
  type SpecialistEntitlements,
} from "@/lib/billing/planEntitlements";
import { normalizeClientIdempotencyKey } from "@/lib/mutations/clientIdempotency";
import type { SpecialistMediaContext } from "@/lib/specialistMedia/context";
import type { SpecialistMediaMutationResponse, SpecialistMediaPageResponse } from "@/lib/specialistMedia/types";
import {
  buildGalleryStoragePath,
  buildIdempotentGalleryStoragePath,
  deleteManagedStoragePaths,
  ensureSpecialistProfileRow,
  extractManagedStoragePath,
  uploadSpecialistMediaObject,
  validateSpecialistMediaUpload,
} from "@/lib/specialistMedia/storage";

export type GalleryMutationDependencies = {
  loadMediaPage?: (
    supabase: Extract<SpecialistMediaContext, { kind: "ok" }>["supabase"],
    specialistId: string,
    lang: AccountCapabilitiesLang,
  ) => Promise<SpecialistMediaPageResponse>;
  loadEntitlements?: (
    supabase: Extract<SpecialistMediaContext, { kind: "ok" }>["supabase"],
    specialistId: string,
  ) => Promise<SpecialistEntitlements>;
};

async function defaultLoadEntitlements(
  supabase: Extract<SpecialistMediaContext, { kind: "ok" }>["supabase"],
  specialistId: string,
) {
  const { data } = await supabase
    .from("specialist_plan")
    .select("plan_code, plan_status")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  return resolveSpecialistEntitlements({
    plan_code: typeof data?.plan_code === "string" ? data.plan_code : "starter",
    plan_status: typeof data?.plan_status === "string" ? data.plan_status : "early_access",
  });
}

async function defaultLoadMediaPage(
  supabase: Extract<SpecialistMediaContext, { kind: "ok" }>["supabase"],
  specialistId: string,
  lang: AccountCapabilitiesLang,
) {
  const { loadSpecialistMediaPage } = await import("@/lib/specialistMedia/loadMediaPage");
  return loadSpecialistMediaPage(supabase, specialistId, lang);
}

function findGalleryUrlByStoragePath(
  galleryUrls: string[],
  specialistId: string,
  storagePath: string,
): string | null {
  return (
    galleryUrls.find((url) => extractManagedStoragePath(url, specialistId) === storagePath) ?? null
  );
}

export async function addSpecialistGalleryImage(
  ctx: Extract<SpecialistMediaContext, { kind: "ok" }>,
  file: File,
  lang: AccountCapabilitiesLang,
  idempotencyKeyInput?: string | null,
  deps: GalleryMutationDependencies = {},
): Promise<
  | { ok: true; status: number; body: SpecialistMediaMutationResponse }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const loadMediaPage = deps.loadMediaPage ?? defaultLoadMediaPage;
  const loadEntitlements = deps.loadEntitlements ?? defaultLoadEntitlements;

  const validation = validateSpecialistMediaUpload(file);
  if (!validation.ok) {
    return { ok: false, status: validation.status, body: { error: validation.error } };
  }

  const profileReady = await ensureSpecialistProfileRow(ctx.supabase, ctx.specialistId);
  if (!profileReady.ok) {
    return { ok: false, status: profileReady.status, body: { error: profileReady.error } };
  }

  const entitlements = await loadEntitlements(ctx.supabase, ctx.specialistId);
  const clientIdempotencyKey = normalizeClientIdempotencyKey(idempotencyKeyInput);
  const idempotentPath = clientIdempotencyKey
    ? buildIdempotentGalleryStoragePath(ctx.specialistId, clientIdempotencyKey, validation.safeExt)
    : null;

  const { data: profileBefore, error: profileBeforeError } = await ctx.supabase
    .from("specialist_profiles")
    .select("gallery_urls")
    .eq("specialist_id", ctx.specialistId)
    .maybeSingle();

  if (profileBeforeError) {
    console.error("[specialistMedia/gallery] profile lookup failed", profileBeforeError.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const galleryBefore = normalizeGalleryUrls(profileBefore?.gallery_urls);

  if (idempotentPath) {
    const replayUrl = findGalleryUrlByStoragePath(galleryBefore, ctx.specialistId, idempotentPath);
    if (replayUrl) {
      const body = await loadMediaPage(ctx.supabase, ctx.specialistId, lang);
      return { ok: true, status: 200, body };
    }
  }

  if (!canAddGalleryImage(galleryBefore.length, entitlements.galleryLimit)) {
    return {
      ok: false,
      status: 409,
      body: buildGalleryLimitError(entitlements, galleryBefore.length),
    };
  }

  const storagePath =
    idempotentPath ?? buildGalleryStoragePath(ctx.specialistId, validation.safeExt);

  const uploaded = await uploadSpecialistMediaObject(
    ctx.supabase,
    storagePath,
    file,
    validation.contentType,
    Boolean(idempotentPath),
  );

  if (!uploaded.ok) {
    return { ok: false, status: uploaded.status, body: { error: uploaded.error } };
  }

  const { data: profileAfterUpload, error: profileAfterUploadError } = await ctx.supabase
    .from("specialist_profiles")
    .select("gallery_urls")
    .eq("specialist_id", ctx.specialistId)
    .maybeSingle();

  if (profileAfterUploadError) {
    console.error("[specialistMedia/gallery] post-upload lookup failed", profileAfterUploadError.message);
    await deleteManagedStoragePaths(ctx.supabase, [uploaded.path]);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const galleryAfterUpload = normalizeGalleryUrls(profileAfterUpload?.gallery_urls);
  const replayUrlAfterRace = findGalleryUrlByStoragePath(
    galleryAfterUpload,
    ctx.specialistId,
    uploaded.path,
  );
  if (replayUrlAfterRace) {
    const body = await loadMediaPage(ctx.supabase, ctx.specialistId, lang);
    return { ok: true, status: 200, body };
  }

  if (!canAddGalleryImage(galleryAfterUpload.length, entitlements.galleryLimit)) {
    await deleteManagedStoragePaths(ctx.supabase, [uploaded.path]);
    return {
      ok: false,
      status: 409,
      body: buildGalleryLimitError(entitlements, galleryAfterUpload.length),
    };
  }

  const nextGallery = [...galleryAfterUpload, uploaded.publicUrl];
  const { error: persistError } = await ctx.supabase
    .from("specialist_profiles")
    .update({ gallery_urls: nextGallery })
    .eq("specialist_id", ctx.specialistId);

  if (persistError) {
    console.error("[specialistMedia/gallery] persist failed", persistError.message);
    await deleteManagedStoragePaths(ctx.supabase, [uploaded.path]);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const body = await loadMediaPage(ctx.supabase, ctx.specialistId, lang);
  return { ok: true, status: 200, body };
}

export async function deleteSpecialistGalleryImage(
  ctx: Extract<SpecialistMediaContext, { kind: "ok" }>,
  requestedUrl: string,
  lang: AccountCapabilitiesLang,
  deps: GalleryMutationDependencies = {},
): Promise<
  | { ok: true; status: number; body: SpecialistMediaMutationResponse }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const loadMediaPage = deps.loadMediaPage ?? defaultLoadMediaPage;

  const normalizedUrl = requestedUrl.trim();
  if (!normalizedUrl) {
    return { ok: false, status: 400, body: { error: "invalid_payload" } };
  }

  const { data: profile, error: profileError } = await ctx.supabase
    .from("specialist_profiles")
    .select("gallery_urls")
    .eq("specialist_id", ctx.specialistId)
    .maybeSingle();

  if (profileError) {
    console.error("[specialistMedia/gallery] delete lookup failed", profileError.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const galleryUrls = normalizeGalleryUrls(profile?.gallery_urls);
  const index = galleryUrls.findIndex((url) => url === normalizedUrl);
  if (index < 0) {
    return { ok: false, status: 404, body: { error: "media_not_found" } };
  }

  const managedPath = extractManagedStoragePath(normalizedUrl, ctx.specialistId);
  const nextGallery = galleryUrls.filter((url) => url !== normalizedUrl);

  const { error: persistError } = await ctx.supabase
    .from("specialist_profiles")
    .update({ gallery_urls: nextGallery })
    .eq("specialist_id", ctx.specialistId);

  if (persistError) {
    console.error("[specialistMedia/gallery] delete persist failed", persistError.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  await deleteManagedStoragePaths(ctx.supabase, [managedPath]);

  const body = await loadMediaPage(ctx.supabase, ctx.specialistId, lang);
  return { ok: true, status: 200, body };
}
