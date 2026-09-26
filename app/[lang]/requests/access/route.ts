import { NextResponse, type NextRequest } from "next/server";
import { resolveRouteLang } from "@/lib/i18n";
import { findAccessGrant } from "@/lib/selection/accessGrant";
import { REQUEST_ACCESS_COOKIE, requestAccessCookieOptions } from "@/lib/selection/accessCookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: { lang: string } | Promise<{ lang: string }> },
) {
  const params = await Promise.resolve(context.params);
  const lang = resolveRouteLang(params.lang);
  const unavailable = new URL(`/${lang}/requests/unavailable`, request.url);
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.redirect(unavailable);

  try {
    const supabase = createSupabaseServerClient();
    const grant = await findAccessGrant(supabase, token);
    if (grant.verdict !== "valid") return NextResponse.redirect(unavailable);
    const row = await supabase
      .from("service_requests")
      .select("public_id, locale")
      .eq("id", grant.requestId)
      .maybeSingle();
    if (!row.data?.public_id) return NextResponse.redirect(unavailable);
    const locale = resolveRouteLang(typeof row.data.locale === "string" ? row.data.locale : lang);
    const destination = new URL(`/${locale}/requests/${row.data.public_id}`, request.url);
    const response = NextResponse.redirect(destination);
    response.cookies.set(REQUEST_ACCESS_COOKIE, token, requestAccessCookieOptions());
    return response;
  } catch (error) {
    console.error("[requests/access] failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.redirect(unavailable);
  }
}
