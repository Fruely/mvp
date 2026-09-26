import type { SupabaseClient } from "@supabase/supabase-js";
import { hashPushToken, isDeviceId, isExpoPushToken } from "./token";

export type PushEndpointPublic = {
  id: string;
  platform: "ios" | "android";
  deviceId: string;
  enabled: boolean;
  permissionState: "unknown" | "granted" | "denied";
  locale: string | null;
  timeZone: string | null;
  invalidatedAt: string | null;
};

function asPlatform(value: unknown): "ios" | "android" | null {
  return value === "ios" || value === "android" ? value : null;
}

function asPermission(value: unknown): "unknown" | "granted" | "denied" {
  return value === "granted" || value === "denied" ? value : "unknown";
}

export function toPublicEndpoint(row: Record<string, unknown>): PushEndpointPublic {
  return {
    id: String(row.id),
    platform: asPlatform(row.platform) ?? "ios",
    deviceId: String(row.device_id ?? ""),
    enabled: row.enabled !== false,
    permissionState: asPermission(row.permission_state),
    locale: typeof row.locale === "string" ? row.locale : null,
    timeZone: typeof row.time_zone === "string" ? row.time_zone : null,
    invalidatedAt: typeof row.invalidated_at === "string" ? row.invalidated_at : null,
  };
}

export async function registerPushEndpoint(
  supabase: SupabaseClient,
  input: {
    actorUserId: string;
    token: string;
    platform: string;
    deviceId: string;
    locale?: string | null;
    timeZone?: string | null;
    permissionState?: string | null;
  },
): Promise<{ id: string; rotated: boolean } | { error: "invalid" | "forbidden" }> {
  if (!input.actorUserId || !isExpoPushToken(input.token) || !isDeviceId(input.deviceId) || !asPlatform(input.platform)) {
    return { error: "invalid" };
  }
  const token = input.token.trim();
  const tokenHash = hashPushToken(token);
  const deviceId = input.deviceId.trim();
  const platform = asPlatform(input.platform);
  const permission = asPermission(input.permissionState);
  const enabled = permission !== "denied";
  const now = new Date().toISOString();
  const byHash = await supabase
    .from("push_endpoints")
    .select("id, user_id, device_id, token_hash")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (byHash.error) return { error: "invalid" };
  if (byHash.data?.id && String(byHash.data.user_id) !== input.actorUserId) return { error: "forbidden" };

  const byDevice = await supabase
    .from("push_endpoints")
    .select("id, token_hash")
    .eq("user_id", input.actorUserId)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (byDevice.error) return { error: "invalid" };
  const existingId = byDevice.data?.id ? String(byDevice.data.id) : byHash.data?.id ? String(byHash.data.id) : null;
  const rotated = Boolean(existingId && byDevice.data?.token_hash && byDevice.data.token_hash !== tokenHash);
  const patch = {
    user_id: input.actorUserId,
    platform,
    provider: "expo",
    token,
    token_hash: tokenHash,
    device_id: deviceId,
    locale: input.locale ?? null,
    time_zone: input.timeZone ?? null,
    enabled,
    permission_state: permission,
    updated_at: now,
    last_seen_at: now,
    invalidated_at: enabled ? null : now,
  };
  if (existingId) {
    const updated = await supabase.from("push_endpoints").update(patch).eq("id", existingId).eq("user_id", input.actorUserId).select("id").maybeSingle();
    if (updated.error || !updated.data?.id) return { error: "invalid" };
    return { id: String(updated.data.id), rotated };
  }
  const inserted = await supabase.from("push_endpoints").insert(patch).select("id").maybeSingle();
  if (inserted.error || !inserted.data?.id) return { error: "invalid" };
  return { id: String(inserted.data.id), rotated: false };
}

export async function listOwnPushEndpoints(supabase: SupabaseClient, userId: string): Promise<PushEndpointPublic[]> {
  if (!userId) return [];
  const rows = await supabase
    .from("push_endpoints")
    .select("id, platform, device_id, enabled, permission_state, locale, time_zone, invalidated_at, user_id")
    .eq("user_id", userId);
  return (rows.data ?? [])
    .filter((row) => String(row.user_id) === userId)
    .map((row) => toPublicEndpoint(row));
}

export async function unregisterPushEndpoint(
  supabase: SupabaseClient,
  input: { actorUserId: string; deviceId: string },
): Promise<{ disabled: boolean } | { error: "invalid" | "forbidden" }> {
  if (!input.actorUserId || !isDeviceId(input.deviceId)) return { error: "invalid" };
  const now = new Date().toISOString();
  const updated = await supabase
    .from("push_endpoints")
    .update({
      enabled: false,
      invalidated_at: now,
      token: null,
      updated_at: now,
    })
    .eq("user_id", input.actorUserId)
    .eq("device_id", input.deviceId.trim())
    .select("id")
    .maybeSingle();
  if (updated.error) return { error: "invalid" };
  if (!updated.data?.id) return { error: "forbidden" };
  return { disabled: true };
}

export async function invalidatePushEndpoint(supabase: SupabaseClient, endpointId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from("push_endpoints")
    .update({ enabled: false, invalidated_at: now, token: null, updated_at: now })
    .eq("id", endpointId)
    .eq("user_id", userId);
}
