import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientCampaignCookieOptions, CLIENT_CAMPAIGN_COOKIE_NAME } from "@/lib/clientCampaignLinks/cookie";
import { campaignLinkToRequestHref } from "@/lib/clientCampaignLinks/resolve";
import { findActiveCampaignBySlug } from "@/lib/clientCampaignLinks/service";
import { getCategoryTitle } from "@/lib/getCategoryTitle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function secureFromRequest(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:";
}

async function resolveCategoryText(
  categoryId: string | null,
  uiLang: string,
): Promise<string | null> {
  if (!categoryId) return null;
  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("categories")
      .select("slug, title, title_ru, title_ua, title_de")
      .eq("id", categoryId)
      .maybeSingle();
    if (!data) return null;
    const title = getCategoryTitle(data, uiLang);
    return title.trim() || null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { slug: string } | Promise<{ slug: string }> },
) {
  const params = await Promise.resolve(context.params);
  const slug = params?.slug?.trim() ?? "";
  if (!slug) {
    notFound();
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    notFound();
  }

  let campaign;
  try {
    campaign = await findActiveCampaignBySlug(supabase, slug);
  } catch (err) {
    console.error("[go/[slug]] lookup failed", err);
    notFound();
  }

  if (!campaign) {
    notFound();
  }

  const categoryText = await resolveCategoryText(campaign.category_id, campaign.ui_lang);
  const targetPath = campaignLinkToRequestHref(campaign, { category_text: categoryText });

  const redirectUrl = request.nextUrl.clone();
  const [pathname, search = ""] = targetPath.split("?");
  redirectUrl.pathname = pathname;
  redirectUrl.search = search ? `?${search}` : "";

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(
    CLIENT_CAMPAIGN_COOKIE_NAME,
    campaign.id,
    clientCampaignCookieOptions(secureFromRequest(request)),
  );

  return response;
}
