import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import {
  ClientCampaignDomainError,
  setClientCampaignLinkActive,
  updateClientCampaignLink,
} from "@/lib/clientCampaignLinks/service";
import { buildCampaignPublicUrl } from "@/lib/clientCampaignLinks/resolve";
import { validateCampaignLinkUpdate } from "@/lib/clientCampaignLinks/validation";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://freuly.de"
  );
}

function jsonError(err: unknown) {
  if (err instanceof ClientCampaignDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[admin/campaign-links/[id]]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

function serializeLink(link: Awaited<ReturnType<typeof updateClientCampaignLink>>) {
  return {
    ...link,
    public_url: buildCampaignPublicUrl(siteOrigin(), link.slug),
    public_path: `/go/${link.slug}`,
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const params = await Promise.resolve(context.params);
    const id = params?.id?.trim();
    if (!id) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400, headers: NO_STORE });
    }

    const body = await request.json().catch(() => null);
    const validated = validateCampaignLinkUpdate(body);
    if ("error" in validated) {
      return NextResponse.json(
        { error: validated.error },
        { status: validated.status, headers: NO_STORE },
      );
    }

    const supabase = createSupabaseServerClient();

    if (
      Object.keys(validated).length === 1 &&
      typeof validated.is_active === "boolean"
    ) {
      const link = await setClientCampaignLinkActive(supabase, id, validated.is_active);
      return NextResponse.json({ link: serializeLink(link) }, { headers: NO_STORE });
    }

    const link = await updateClientCampaignLink(supabase, id, validated);
    return NextResponse.json({ link: serializeLink(link) }, { headers: NO_STORE });
  } catch (err) {
    return jsonError(err);
  }
}
