import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function SpecialistClaimPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    redirect("/specialist/claim/invalid");
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
    redirect("/specialist/claim/invalid");
  }

  const row = specialist as {
    id: string;
    email: string | null;
    claim_token_used_at: string | null;
    claim_token_expires_at: string | null;
  };

  if (row.claim_token_used_at) {
    redirect("/specialist/claim/invalid");
  }

  if (!row.claim_token_expires_at || row.claim_token_expires_at <= now) {
    redirect("/specialist/claim/invalid");
  }

  const email = row.email && String(row.email).trim();
  if (!email) {
    redirect("/specialist/claim/invalid");
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://freuly.de");
  const redirectTo = `${baseUrl}/specialist/dashboard`;

  const first = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (first.error && /user.*not.*found|not found/i.test(first.error.message ?? "")) {
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    const second = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (second.error || !second.data?.properties?.action_link) {
      console.error("[specialist/claim] generateLink failed after createUser", second.error);
      redirect("/specialist/claim/invalid");
    }

    redirect(second.data.properties.action_link);
  }

  if (first.error || !first.data?.properties?.action_link) {
    console.error("[specialist/claim] generateLink failed", first.error);
    redirect("/specialist/claim/invalid");
  }

  redirect(first.data.properties.action_link);
}
