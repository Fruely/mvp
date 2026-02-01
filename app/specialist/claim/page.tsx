import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const HTML_ERROR = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Ссылка недействительна</title></head><body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5;"><p>Ссылка недействительна или устарела.</p><p>Вы можете запросить новую ссылку, написав на <a href="mailto:info@freuly.de">info@freuly.de</a>.</p></body></html>`;

type Props = { searchParams: Promise<{ token?: string }> };

export default async function SpecialistClaimPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    return new Response(HTML_ERROR, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: specialist, error: fetchError } = await supabase
    .from("specialists")
    .select("id, email, claim_token_used_at, claim_token_expires_at")
    .eq("claim_token", token)
    .maybeSingle();

  if (fetchError || !specialist) {
    console.error("[specialist/claim] fetch failed or not found", fetchError);
    return new Response(HTML_ERROR, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const row = specialist as {
    id: string;
    email: string | null;
    claim_token_used_at: string | null;
    claim_token_expires_at: string | null;
  };

  if (row.claim_token_used_at) {
    return new Response(HTML_ERROR, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!row.claim_token_expires_at || row.claim_token_expires_at <= now) {
    return new Response(HTML_ERROR, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const email = row.email && String(row.email).trim();
  if (!email) {
    return new Response(HTML_ERROR, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://freuly.de");
  const redirectTo = `${baseUrl}/specialist/dashboard`;

  let linkData: { properties?: { action_link?: string } } | null = null;
  let linkError: { message?: string } | null = null;

  const first = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  linkData = first.data;
  linkError = first.error;

  if (linkError && /user.*not.*found|not found/i.test(linkError.message ?? "")) {
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    const second = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    linkData = second.data;
    linkError = second.error;
  }

  if (linkError || !linkData?.properties?.action_link) {
    console.error("[specialist/claim] generateLink failed", linkError);
    return new Response(HTML_ERROR, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  redirect(linkData.properties.action_link);
}
