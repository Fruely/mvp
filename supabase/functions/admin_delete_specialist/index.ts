/**
 * Hard-delete a specialist: admin token auth, storage cleanup, then public.admin_delete_specialist_tx.
 *
 * Deploy (set secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_API_TOKEN — same value as Next ADMIN_API_TOKEN;
 *   ENABLE_SPECIALIST_HARD_DELETE=true or the function returns 403 "Hard delete disabled"):
 *   supabase secrets set ADMIN_API_TOKEN=...
 *   supabase functions deploy admin_delete_specialist
 *
 * Recommended: verify_jwt = false for this function (custom x-admin-token gate). See supabase/config.toml.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";

const BUCKET_AVATARS = "specialist-avatars";
const BUCKET_VERIFICATION = "verification_docs";
const BUCKET_PROOFS = "specialist-proofs";

type Payload = {
  specialist_id?: string;
  delete_auth_user?: boolean;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  req?: Request
): Response {
  const origin = req?.headers.get("Origin") ?? "*";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-admin-token",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v?.trim()) {
    throw new Error(`Missing env: ${name}`);
  }
  return v.trim();
}

function extractPublicObjectPath(
  publicUrl: string,
  bucket: string
): string | null {
  try {
    const u = new URL(publicUrl.trim());
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const raw = u.pathname.slice(idx + marker.length);
    return decodeURIComponent(raw.split("?")[0] ?? "");
  } catch {
    return null;
  }
}

/** Collect object paths for flat specialist-proofs uploads from stored URLs. */
function proofPathsFromUrls(urls: Iterable<string | null | undefined>): string[] {
  const out: string[] = [];
  for (const u of urls) {
    if (!u || typeof u !== "string") continue;
    const p = extractPublicObjectPath(u, BUCKET_PROOFS);
    if (p) out.push(p);
  }
  return out;
}

async function deleteStoragePrefix(
  admin: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<void> {
  async function removePath(path: string): Promise<void> {
    const { data: items, error } = await admin.storage.from(bucket).list(path, {
      limit: 1000,
      offset: 0,
    });
    if (error) throw new Error(`storage.list ${bucket}/${path}: ${error.message}`);
    for (const item of items ?? []) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      if (item.metadata) {
        const { error: rmErr } = await admin.storage.from(bucket).remove([itemPath]);
        if (rmErr) throw new Error(`storage.remove ${bucket}/${itemPath}: ${rmErr.message}`);
      } else {
        await removePath(itemPath);
      }
    }
  }

  await removePath(prefix.replace(/\/$/, ""));
}

async function removePathsInBatches(
  admin: SupabaseClient,
  bucket: string,
  paths: string[]
): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  const batchSize = 100;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const { error } = await admin.storage.from(bucket).remove(batch);
    if (error) throw new Error(`storage.remove batch ${bucket}: ${error.message}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true }, 204, req);
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, req);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, req);
  }

  const specialistId =
    typeof payload.specialist_id === "string" ? payload.specialist_id.trim() : "";
  if (!specialistId) {
    return jsonResponse({ ok: false, error: "specialist_id is required" }, 400, req);
  }

  const deleteAuthUser = payload.delete_auth_user === true;

  const expectedToken = requireEnv("ADMIN_API_TOKEN");
  const provided = req.headers.get("x-admin-token")?.trim();
  if (!provided || provided !== expectedToken) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401, req);
  }

  if (Deno.env.get("ENABLE_SPECIALIST_HARD_DELETE") !== "true") {
    return jsonResponse({ ok: false, error: "Hard delete disabled" }, 403, req);
  }

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: spec, error: specErr } = await admin
      .from("specialists")
      .select("id, email, user_id, proof_link")
      .eq("id", specialistId)
      .maybeSingle();

    if (specErr) {
      return jsonResponse(
        { ok: false, error: specErr.message || "Failed to load specialist" },
        500,
        req
      );
    }
    if (!spec) {
      return jsonResponse({ ok: false, error: "SPECIALIST_NOT_FOUND" }, 404, req);
    }

    const emailLower =
      typeof spec.email === "string" ? spec.email.trim().toLowerCase() : "";

    const proofUrls: (string | null)[] = [spec.proof_link as string | null];

    if (emailLower) {
      const { data: apps, error: appsErr } = await admin
        .from("specialist_applications")
        .select("proof_link")
        .eq("email", emailLower);
      if (appsErr) {
        return jsonResponse(
          { ok: false, error: appsErr.message || "Failed to load applications" },
          500,
          req
        );
      }
      for (const row of apps ?? []) {
        proofUrls.push((row as { proof_link?: string | null }).proof_link ?? null);
      }
    }

    const proofPaths = proofPathsFromUrls(proofUrls);

    await deleteStoragePrefix(admin, BUCKET_AVATARS, specialistId);
    await deleteStoragePrefix(admin, BUCKET_VERIFICATION, specialistId);
    if (proofPaths.length > 0) {
      await removePathsInBatches(admin, BUCKET_PROOFS, proofPaths);
    }

    const { data: rpcData, error: rpcErr } = await admin.rpc(
      "admin_delete_specialist_tx",
      { p_specialist_id: specialistId }
    );

    if (rpcErr) {
      const msg = rpcErr.message ?? String(rpcErr);
      if (/SPECIALIST_NOT_FOUND|specialist_not_found/i.test(msg)) {
        return jsonResponse({ ok: false, error: "SPECIALIST_NOT_FOUND" }, 404, req);
      }
      return jsonResponse(
        { ok: false, error: `db: ${msg}` },
        500,
        req
      );
    }

    if (deleteAuthUser && spec.user_id) {
      const { error: delUserErr } = await admin.auth.admin.deleteUser(
        spec.user_id as string
      );
      if (delUserErr) {
        return jsonResponse(
          {
            ok: false,
            error: `Specialist deleted but auth user delete failed: ${delUserErr.message}`,
          },
          500,
          req
        );
      }
    }

    return jsonResponse(
      {
        ok: true,
        result: rpcData,
        auth_user_deleted: Boolean(deleteAuthUser && spec.user_id),
      },
      200,
      req
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("Missing env:")) {
      return jsonResponse({ ok: false, error: "Server misconfigured" }, 500, req);
    }
    return jsonResponse({ ok: false, error: msg }, 500, req);
  }
});
