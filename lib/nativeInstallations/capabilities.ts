import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Client-contract capability. It means the installed app understands
 * access_offer and reserve-first TAKE. It is not payment, entitlement,
 * or a subscription.
 */
export const PAID_REQUEST_ACCESS_CAPABILITY = "paid_request_access_v1";

/**
 * Fully usable store-purchase contract for paid service-request access.
 * Distinct from paid_request_access_v1, which only understands reserve-first TAKE.
 * Store-distributed iOS advertises this name. Android does not.
 */
export const PAID_REQUEST_STORE_PURCHASE_CAPABILITY = "paid_request_store_purchase_v1";

const KNOWN_CAPABILITIES = new Set<string>([
  PAID_REQUEST_ACCESS_CAPABILITY,
  PAID_REQUEST_STORE_PURCHASE_CAPABILITY,
]);

/**
 * Omitted field is an empty set. A non-array is invalid.
 * Unknown names are dropped. Known names are stored once.
 */
export function normalizeRegistrationCapabilities(body: Record<string, unknown>): string[] | "invalid" {
  if (!Object.prototype.hasOwnProperty.call(body, "capabilities")) return [];
  const value = body.capabilities;
  if (!Array.isArray(value)) return "invalid";
  const stored: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return "invalid";
    if (KNOWN_CAPABILITIES.has(item) && !stored.includes(item)) stored.push(item);
  }
  return stored;
}

function capabilityList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * A user is capable when at least one active installation advertises the capability.
 * Inactive rows, other users, and push endpoints do not count.
 */
export async function activeUserIdsWithNativeCapability(
  supabase: Pick<SupabaseClient, "from">,
  userIds: readonly string[],
  capability: string = PAID_REQUEST_ACCESS_CAPABILITY,
): Promise<Set<string> | { error: true }> {
  const ids: string[] = [];
  for (const userId of userIds) {
    if (userId && !ids.includes(userId)) ids.push(userId);
  }
  if (ids.length === 0) return new Set();
  const result = await supabase
    .from("native_installations")
    .select("user_id, capabilities")
    .eq("active", true)
    .in("user_id", ids);
  if (result.error) return { error: true };
  const capable = new Set<string>();
  for (const row of result.data ?? []) {
    const userId = typeof row.user_id === "string" ? row.user_id : "";
    if (userId && capabilityList(row.capabilities).includes(capability)) capable.add(userId);
  }
  return capable;
}
