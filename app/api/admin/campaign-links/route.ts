import { NextRequest, NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { ClientCampaignDomainError } from "@/lib/clientCampaignLinks/errors";
import { campaignPublicPath, campaignPublicUrl } from "@/lib/clientCampaignLinks/publicUrl";
import {
  createCampaignLink,
  listCampaignLinks,
} from "@/lib/clientCampaignLinks/service";
import { summarizeCampaignContext, validateCampaignLinkCreate } from "@/lib/clientCampaignLinks/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(err: unknown) {
  if (err instanceof ClientCampaignDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[admin/campaign-links]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

function serializeLink(link: Awaited<ReturnType<typeof listCampaignLinks>>[number]) {
  return {
    ...link,
    public_path: campaignPublicPath(link.slug),
    public_url: campaignPublicUrl(link.slug),
    context_summary: summarizeCampaignContext(link),
  };
}

export async function GET(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const supabase = createSupabaseServerClient();
    const links = await listCampaignLinks(supabase);
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
    const link = await createCampaignLink(supabase, validated);
    return NextResponse.json(
      { link: serializeLink(link) },
      { status: 201, headers: NO_STORE },
    );
  } catch (err) {
    return jsonError(err);
  }
}
