import type { SupabaseClient } from "@supabase/supabase-js";
import { accessTokenExpiry, accessTokenVerdict, generateAccessToken, hashAccessToken } from "./accessToken";

export async function issueAccessToken(supabase: SupabaseClient, requestId: string, now = new Date()): Promise<string | null> {
  const issued = generateAccessToken();
  const { error } = await supabase.from("service_request_access_tokens").insert({
    service_request_id: requestId,
    token_hash: issued.tokenHash,
    expires_at: accessTokenExpiry(now),
    revoked_at: null,
  });
  if (error) return null;
  return issued.token;
}

export async function resolveAccessToken(
  supabase: SupabaseClient,
  token: string,
  requestId: string,
  now = new Date(),
): Promise<"valid" | "invalid" | "expired" | "revoked" | "wrong_request"> {
  const tokenHash = hashAccessToken(token);
  const row = await supabase
    .from("service_request_access_tokens")
    .select("service_request_id, token_hash, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (row.error || !row.data) return "invalid";
  return accessTokenVerdict(
    {
      service_request_id: String(row.data.service_request_id),
      token_hash: String(row.data.token_hash),
      expires_at: String(row.data.expires_at),
      revoked_at: row.data.revoked_at ? String(row.data.revoked_at) : null,
    },
    requestId,
    now,
  );
}

export async function findAccessGrant(
  supabase: SupabaseClient,
  token: string,
  now = new Date(),
): Promise<{ verdict: "valid"; requestId: string } | { verdict: "invalid" | "expired" | "revoked" }> {
  const raw = token.trim();
  if (!raw || raw.length > 200) return { verdict: "invalid" };
  const tokenHash = hashAccessToken(raw);
  const row = await supabase
    .from("service_request_access_tokens")
    .select("service_request_id, token_hash, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (row.error || !row.data?.service_request_id) return { verdict: "invalid" };
  const requestId = String(row.data.service_request_id);
  const verdict = accessTokenVerdict(
    {
      service_request_id: requestId,
      token_hash: String(row.data.token_hash),
      expires_at: String(row.data.expires_at),
      revoked_at: row.data.revoked_at ? String(row.data.revoked_at) : null,
    },
    requestId,
    now,
  );
  if (verdict === "valid") return { verdict: "valid", requestId };
  if (verdict === "expired" || verdict === "revoked") return { verdict };
  return { verdict: "invalid" };
}

export async function revokeAccessToken(supabase: SupabaseClient, tokenHash: string, now = new Date()): Promise<void> {
  await supabase
    .from("service_request_access_tokens")
    .update({ revoked_at: now.toISOString() })
    .eq("token_hash", tokenHash)
    .is("revoked_at", null);
}
