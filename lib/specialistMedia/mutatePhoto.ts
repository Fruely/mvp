import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import {
  deleteManagedStoragePaths,
  ensureSpecialistProfileRow,
  extractManagedStoragePath,
  buildProfilePhotoStoragePath,
  uploadSpecialistMediaObject,
  validateSpecialistMediaUpload,
} from "@/lib/specialistMedia/storage";
import type { SpecialistMediaContext } from "@/lib/specialistMedia/context";
import type { SpecialistMediaMutationResponse, SpecialistMediaPageResponse } from "@/lib/specialistMedia/types";
import { photoFocusClearPatch } from "@/lib/specialists/photoFocusMetadata";

export type PhotoMutationDependencies = {
  loadMediaPage?: (
    supabase: Extract<SpecialistMediaContext, { kind: "ok" }>["supabase"],
    specialistId: string,
    lang: AccountCapabilitiesLang,
  ) => Promise<SpecialistMediaPageResponse>;
};

async function defaultLoadMediaPage(
  supabase: Extract<SpecialistMediaContext, { kind: "ok" }>["supabase"],
  specialistId: string,
  lang: AccountCapabilitiesLang,
) {
  const { loadSpecialistMediaPage } = await import("@/lib/specialistMedia/loadMediaPage");
  return loadSpecialistMediaPage(supabase, specialistId, lang);
}

export async function uploadSpecialistProfilePhoto(
  ctx: Extract<SpecialistMediaContext, { kind: "ok" }>,
  file: File,
  lang: AccountCapabilitiesLang,
  deps: PhotoMutationDependencies = {},
): Promise<
  | { ok: true; status: number; body: SpecialistMediaMutationResponse }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const loadMediaPage = deps.loadMediaPage ?? defaultLoadMediaPage;

  const validation = validateSpecialistMediaUpload(file);
  if (!validation.ok) {
    return { ok: false, status: validation.status, body: { error: validation.error } };
  }

  const profileReady = await ensureSpecialistProfileRow(ctx.supabase, ctx.specialistId);
  if (!profileReady.ok) {
    return { ok: false, status: profileReady.status, body: { error: profileReady.error } };
  }

  const [{ data: specialistRow, error: specialistError }, { data: profileRow, error: profileError }] =
    await Promise.all([
      ctx.supabase.from("specialists").select("avatar_url").eq("id", ctx.specialistId).maybeSingle(),
      ctx.supabase
        .from("specialist_profiles")
        .select("photo_url, photo_focus")
        .eq("specialist_id", ctx.specialistId)
        .maybeSingle(),
    ]);

  if (specialistError || profileError || !specialistRow) {
    console.error("[specialistMedia/photo] current state lookup failed", specialistError?.message, profileError?.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const previousPhotoUrl = typeof profileRow?.photo_url === "string" ? profileRow.photo_url : null;
  const previousPhotoFocus = profileRow?.photo_focus ?? null;
  const previousAvatarUrl = typeof specialistRow.avatar_url === "string" ? specialistRow.avatar_url : null;
  const previousPhotoPath = extractManagedStoragePath(previousPhotoUrl, ctx.specialistId);
  const previousAvatarPath = extractManagedStoragePath(previousAvatarUrl, ctx.specialistId);

  const storagePath = buildProfilePhotoStoragePath(ctx.specialistId, validation.safeExt);
  const uploaded = await uploadSpecialistMediaObject(
    ctx.supabase,
    storagePath,
    file,
    validation.contentType,
    false,
  );

  if (!uploaded.ok) {
    return { ok: false, status: uploaded.status, body: { error: uploaded.error } };
  }

  const { error: profileUpdateError } = await ctx.supabase
    .from("specialist_profiles")
    .update({ photo_url: uploaded.publicUrl, ...photoFocusClearPatch() })
    .eq("specialist_id", ctx.specialistId);

  if (profileUpdateError) {
    console.error("[specialistMedia/photo] profile update failed", profileUpdateError.message);
    await deleteManagedStoragePaths(ctx.supabase, [uploaded.path]);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const { error: avatarUpdateError } = await ctx.supabase
    .from("specialists")
    .update({ avatar_url: uploaded.publicUrl })
    .eq("id", ctx.specialistId);

  if (avatarUpdateError) {
    console.error("[specialistMedia/photo] avatar update failed", avatarUpdateError.message);
    await ctx.supabase
      .from("specialist_profiles")
      .update({ photo_url: previousPhotoUrl, photo_focus: previousPhotoFocus })
      .eq("specialist_id", ctx.specialistId);
    await deleteManagedStoragePaths(ctx.supabase, [uploaded.path]);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const pathsToDelete = [previousPhotoPath, previousAvatarPath].filter(
    (path) => path && path !== uploaded.path,
  );
  await deleteManagedStoragePaths(ctx.supabase, pathsToDelete);

  const body = await loadMediaPage(ctx.supabase, ctx.specialistId, lang);
  return { ok: true, status: 200, body };
}

export async function deleteSpecialistProfilePhoto(
  ctx: Extract<SpecialistMediaContext, { kind: "ok" }>,
  lang: AccountCapabilitiesLang,
  deps: PhotoMutationDependencies = {},
): Promise<
  | { ok: true; status: number; body: SpecialistMediaMutationResponse }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const loadMediaPage = deps.loadMediaPage ?? defaultLoadMediaPage;

  const [{ data: specialistRow, error: specialistError }, { data: profileRow, error: profileError }] =
    await Promise.all([
      ctx.supabase.from("specialists").select("avatar_url").eq("id", ctx.specialistId).maybeSingle(),
      ctx.supabase
        .from("specialist_profiles")
        .select("photo_url, photo_focus")
        .eq("specialist_id", ctx.specialistId)
        .maybeSingle(),
    ]);

  if (specialistError || profileError || !specialistRow) {
    console.error("[specialistMedia/photo] delete lookup failed", specialistError?.message, profileError?.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const previousPhotoUrl = typeof profileRow?.photo_url === "string" ? profileRow.photo_url : null;
  const previousPhotoFocus = profileRow?.photo_focus ?? null;
  const previousAvatarUrl = typeof specialistRow.avatar_url === "string" ? specialistRow.avatar_url : null;
  const previousPhotoPath = extractManagedStoragePath(previousPhotoUrl, ctx.specialistId);
  const previousAvatarPath = extractManagedStoragePath(previousAvatarUrl, ctx.specialistId);

  const { error: profileUpdateError } = await ctx.supabase
    .from("specialist_profiles")
    .update({ photo_url: null, ...photoFocusClearPatch() })
    .eq("specialist_id", ctx.specialistId);

  if (profileUpdateError) {
    console.error("[specialistMedia/photo] delete profile update failed", profileUpdateError.message);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const { error: avatarUpdateError } = await ctx.supabase
    .from("specialists")
    .update({ avatar_url: null })
    .eq("id", ctx.specialistId);

  if (avatarUpdateError) {
    console.error("[specialistMedia/photo] delete avatar update failed", avatarUpdateError.message);
    await ctx.supabase
      .from("specialist_profiles")
      .update({ photo_url: previousPhotoUrl, photo_focus: previousPhotoFocus })
      .eq("specialist_id", ctx.specialistId);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  await deleteManagedStoragePaths(ctx.supabase, [previousPhotoPath, previousAvatarPath]);

  const body = await loadMediaPage(ctx.supabase, ctx.specialistId, lang);
  return { ok: true, status: 200, body };
}
