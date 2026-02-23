import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return json({ error: "Token is required" }, 400);
    }

    const service = createSupabaseServerClient();
    const now = new Date().toISOString();

    const { data: specialist, error } = await service
      .from("specialists")
      .select("id, email, claim_token_used_at, claim_token_expires_at")
      .eq("claim_token", token)
      .maybeSingle();

    if (error || !specialist) {
      return json({ error: "invalid token", reason: "not_found" }, 400);
    }

    if (specialist.claim_token_used_at) {
      return json({ error: "invalid token", reason: "used" }, 400);
    }

    if (
      !specialist.claim_token_expires_at ||
      specialist.claim_token_expires_at <= now
    ) {
      return json({ error: "invalid token", reason: "expired" }, 400);
    }

    const email = specialist.email && String(specialist.email).trim();
    if (!email) {
      return json({ error: "invalid token", reason: "no_email" }, 400);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://freuly.de");
    const redirectTo = `${baseUrl}/specialist/claim`;

    const first = await service.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (
      first.error &&
      /user.*not.*found|not found/i.test(first.error.message ?? "")
    ) {
      await service.auth.admin.createUser({
        email,
        email_confirm: true,
      });

      const second = await service.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });

      if (second.error || !second.data?.properties?.action_link) {
        console.error(
          "[specialist/claim-init] generateLink failed after createUser",
          second.error
        );
        return json({ error: "failed to generate link" }, 500);
      }

      return json({ action_link: second.data.properties.action_link }, 200);
    }

    if (first.error || !first.data?.properties?.action_link) {
      console.error("[specialist/claim-init] generateLink failed", first.error);
      return json({ error: "failed to generate link" }, 500);
    }

    return json({ action_link: first.data.properties.action_link }, 200);
  } catch (err: unknown) {
    console.error("[specialist/claim-init] unexpected error", err);
    return json({ error: "internal server error" }, 500);
  }
}
