import type { SupabaseClient } from "@supabase/supabase-js";

function storedAddress(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Address for a client-facing event email.
 * Uses the address already stored on the request. For an owned request with
 * no stored address, reads the auth user at send time and does not write it back.
 */
export async function resolveClientEventEmail(
  supabase: SupabaseClient,
  input: { storedEmail: unknown; clientUserId: string | null },
): Promise<string | null> {
  const stored = storedAddress(input.storedEmail);
  if (stored) return stored;
  if (!input.clientUserId) return null;

  const { data, error } = await supabase.auth.admin.getUserById(input.clientUserId);
  if (error) return null;
  return storedAddress(data.user?.email);
}
