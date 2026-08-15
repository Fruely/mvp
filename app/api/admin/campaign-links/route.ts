import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import {
  ClientCampaignDomainError,
  createClientCampaignLink,
  listClientCampaignLinks,
} from "@/lib/clientCampaignLinks/service";
import { buildCampaignPublicUrl } from "@/lib/clientCampaignLinks/resolve";
import { validateCampaignLinkCreate } from "@/lib/clientCampaignLinks/validation";

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
  console.error("[admin/campaign-links]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

function serializeLink(link: Awaited<ReturnType<typeof listClientCampaignLinks>>[number]) {
  return {
    ...link,
    public_url: buildCampaignPublicUrl(siteOrigin(), link.slug),
    public_path: `/go/${link.slug}`,
  };
}

export async function GET(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const supabase = createSupabaseServerClient();
    const links = await listClientCampaignLinks(supabase);
    return NextResponse.json(
      { links: links.map(serializeLink) },
      { headers: NO_STORE },
    );
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => null);
    const validated = validateCampaignLinkCreate(body);
    if ("error" in validated) {
      return NextResponse.json(
        { error: validated.error },
        { status: validated.status, headers: NO_STORE },
      );
    }

    const supabase = createSupabaseServerClient();
    const link = await createClientCampaignLink(supabase, validated);
    return NextResponse.json(
      { link: serializeLink(link) },
      { status: 201, headers: NO_STORE },
    );
  } catch (err) {
    return jsonError(err);
  }
}
