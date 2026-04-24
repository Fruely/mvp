import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";

const ALLOWED_PLAN_CODES = new Set(["starter", "basic", "premium"]);
const ALLOWED_PLAN_STATUSES = new Set([
  "early_access",
  "trialing",
  "active",
  "grace",
  "grace_period",
  "expired",
  "cancelled",
]);

const NO_STORE = { "Cache-Control": "no-store" } as const;

function parseOptionalTimestamptz(value: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "expires_at and grace_until must be strings, null, or omitted" };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: "Invalid date format (use ISO 8601)" };
  }
  return { ok: true, value: d.toISOString() };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  const resolved = await Promise.resolve(params);
  const specialistId = resolved?.id?.trim();
  if (!specialistId) {
    return NextResponse.json({ error: "Missing specialist id" }, { status: 400, headers: NO_STORE });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_STORE });
  }

  const planCodeRaw = typeof body.plan_code === "string" ? body.plan_code.trim().toLowerCase() : "";
  const planStatusRaw = typeof body.plan_status === "string" ? body.plan_status.trim().toLowerCase() : "";

  if (!ALLOWED_PLAN_CODES.has(planCodeRaw)) {
    return NextResponse.json(
      { error: "Invalid plan_code", allowed: Array.from(ALLOWED_PLAN_CODES) },
      { status: 400, headers: NO_STORE }
    );
  }
  if (!ALLOWED_PLAN_STATUSES.has(planStatusRaw)) {
    return NextResponse.json(
      { error: "Invalid plan_status", allowed: Array.from(ALLOWED_PLAN_STATUSES) },
      { status: 400, headers: NO_STORE }
    );
  }

  const expiresParsed = parseOptionalTimestamptz(body.expires_at);
  if (!expiresParsed.ok) {
    return NextResponse.json({ error: expiresParsed.error }, { status: 400, headers: NO_STORE });
  }
  const graceParsed = parseOptionalTimestamptz(body.grace_until);
  if (!graceParsed.ok) {
    return NextResponse.json({ error: graceParsed.error }, { status: 400, headers: NO_STORE });
  }

  const supabase = createSupabaseServerClient();

  const { data: specialist, error: specErr } = await supabase
    .from("specialists")
    .select("id")
    .eq("id", specialistId)
    .maybeSingle();

  if (specErr) {
    console.error("[admin/subscription] specialist lookup", specErr);
    return NextResponse.json({ error: "Failed to verify specialist" }, { status: 500, headers: NO_STORE });
  }
  if (!specialist) {
    return NextResponse.json({ error: "Specialist not found" }, { status: 404, headers: NO_STORE });
  }

  const nowIso = new Date().toISOString();

  const { data: existing, error: existingErr } = await supabase
    .from("specialist_plan")
    .select("id, specialist_id")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (existingErr) {
    console.error("[admin/subscription] plan lookup", existingErr);
    return NextResponse.json({ error: "Failed to read subscription row" }, { status: 500, headers: NO_STORE });
  }

  const patch = {
    plan_code: planCodeRaw,
    plan_status: planStatusRaw,
    expires_at: expiresParsed.value,
    grace_until: graceParsed.value,
    updated_at: nowIso,
  };

  if (existing) {
    const { data: updated, error: updErr } = await supabase
      .from("specialist_plan")
      .update(patch)
      .eq("specialist_id", specialistId)
      .select("specialist_id, plan_code, plan_status, started_at, expires_at, grace_until, updated_at")
      .single();

    if (updErr || !updated) {
      console.error("[admin/subscription] update failed", updErr);
      return NextResponse.json({ error: "Failed to update specialist_plan" }, { status: 500, headers: NO_STORE });
    }
    return NextResponse.json({ success: true, data: updated }, { status: 200, headers: NO_STORE });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("specialist_plan")
    .insert({
      specialist_id: specialistId,
      plan_code: planCodeRaw,
      plan_status: planStatusRaw,
      expires_at: expiresParsed.value,
      grace_until: graceParsed.value,
      updated_at: nowIso,
    })
    .select("specialist_id, plan_code, plan_status, started_at, expires_at, grace_until, updated_at")
    .single();

  if (insErr || !inserted) {
    console.error("[admin/subscription] insert failed", insErr);
    return NextResponse.json({ error: "Failed to create specialist_plan" }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ success: true, data: inserted }, { status: 200, headers: NO_STORE });
}
