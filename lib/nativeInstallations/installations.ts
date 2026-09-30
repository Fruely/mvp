import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeRegistrationCapabilities } from "@/lib/nativeInstallations/capabilities";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type NativePlatform = "ios" | "android";

export type InstallationCommand = {
  actorUserId: string;
  installationId: string;
  platform: string;
  capabilities: string[] | "invalid";
};

/**
 * Session identity only. A user id in the body is ignored.
 */
export function installationCommand(actorUserId: string, body: Record<string, unknown>): InstallationCommand {
  return {
    actorUserId,
    installationId: typeof body.installationId === "string" ? body.installationId : "",
    platform: typeof body.platform === "string" ? body.platform : "",
    capabilities: normalizeRegistrationCapabilities(body),
  };
}

function asPlatform(value: string): NativePlatform | null {
  return value === "ios" || value === "android" ? value : null;
}

async function updateInstallation(
  supabase: SupabaseClient,
  input: { installationId: string; patch: Record<string, unknown>; userId?: string },
): Promise<boolean> {
  let query = supabase.from("native_installations").update(input.patch).eq("installation_id", input.installationId);
  if (input.userId) query = query.eq("user_id", input.userId);
  const updated = await query.select("installation_id").maybeSingle();
  if (updated.error) return false;
  return Boolean(updated.data?.installation_id);
}

export async function registerNativeInstallation(
  supabase: SupabaseClient,
  input: InstallationCommand & { now?: string },
): Promise<{ installationId: string; active: true } | { error: "invalid" }> {
  const platform = asPlatform(input.platform);
  const installationId = input.installationId.trim().toLowerCase();
  if (!input.actorUserId || !UUID.test(installationId) || !platform || input.capabilities === "invalid") {
    return { error: "invalid" };
  }
  const capabilities = input.capabilities ?? [];
  const now = input.now ?? new Date().toISOString();
  const existing = await supabase
    .from("native_installations")
    .select("installation_id, registered_at")
    .eq("installation_id", installationId)
    .maybeSingle();
  if (existing.error) return { error: "invalid" };

  const assignment = {
    user_id: input.actorUserId,
    platform,
    active: true,
    last_seen_at: now,
    deactivated_at: null,
    capabilities,
  };
  if (existing.data?.installation_id) {
    const saved = await updateInstallation(supabase, { installationId, patch: assignment });
    if (!saved) return { error: "invalid" };
    return { installationId, active: true };
  }

  const inserted = await supabase
    .from("native_installations")
    .insert({
      installation_id: installationId,
      registered_at: now,
      ...assignment,
    })
    .select("installation_id")
    .maybeSingle();
  if (!inserted.error && inserted.data?.installation_id) return { installationId, active: true };

  const saved = await updateInstallation(supabase, { installationId, patch: assignment });
  if (!saved) return { error: "invalid" };
  return { installationId, active: true };
}

export async function deactivateNativeInstallation(
  supabase: SupabaseClient,
  input: { actorUserId: string; installationId: string; now?: string },
): Promise<{ active: false } | { error: "invalid" | "forbidden" }> {
  const installationId = input.installationId.trim().toLowerCase();
  if (!input.actorUserId || !UUID.test(installationId)) return { error: "invalid" };
  const now = input.now ?? new Date().toISOString();
  const saved = await updateInstallation(supabase, {
    installationId,
    userId: input.actorUserId,
    patch: {
      active: false,
      deactivated_at: now,
      last_seen_at: now,
    },
  });
  if (!saved) return { error: "forbidden" };
  return { active: false };
}
