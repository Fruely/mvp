import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import {
  ClientCampaignDomainError,
  getClientCampaignLinkById,
  setClientCampaignLinkActive,
  updateClientCampaignLink,
} from "@/lib/clientCampaignLinks/service";
import { campaignPublicPath, campaignPublicUrl } from "@/lib/clientCampaignLinks/publicUrl";
import { summarizeCampaignContext } from "@/lib/clientCampaignLinks/resolve";
import { validateCampaignLinkUpdate } from "@/lib/clientCampaignLinks/validation";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(err: unknown) {
  if (err instanceof ClientCampaignDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[admin/campaign-links/[id]]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

function serializeLink(link: NonNullable<Awaited<ReturnType<typeof getClientCampaignLinkById>>>) {
  return {
    ...link,
    public_path: campaignPublicPath(link.slug),
    public_url: campaignPublicUrl(link.slug),
    context_summary: summarizeCampaignContext(link),
  };
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const params = await Promise.resolve(context.params);
    const supabase = createSupabaseServerClient();
    const link = await getClientCampaignLinkById(supabase, params.id);
    if (!link) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json({ link: serializeLink(link) }, { headers: NO_STORE });
  } catch (err) {
    return jsonError(err);
  }
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

    if (body && typeof body === "object" && typeof (body as { is_active?: unknown }).is_active === "boolean") {
      const keys = Object.keys(body as object);
      if (keys.length === 1 && keys[0] === "is_active") {
        const supabase = createSupabaseServerClient();
        const link = await setClientCampaignLinkActive(
          supabase,
          id,
          (body as { is_active: boolean }).is_active,
        );
        return NextResponse.json({ link: serializeLink(link) }, { headers: NO_STORE });
      }
    }

    const validated = validateCampaignLinkUpdate(body);
    if ("error" in validated) {
      return NextResponse.json(
        { error: validated.error },
        { status: validated.status, headers: NO_STORE },
      );
    }

    const supabase = createSupabaseServerClient();
    const link = await updateClientCampaignLink(supabase, id, validated);
    return NextResponse.json({ link: serializeLink(link) }, { headers: NO_STORE });
  } catch (err) {
    return jsonError(err);
  }
}
