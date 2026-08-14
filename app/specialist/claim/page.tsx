import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServerComponentClient as createAuthServerClient } from "@/lib/supabase/auth-server";
import { specialistDashboardPath } from "@/lib/specialists/navigation";
import { isSupportedLang, getDictionary, type Lang } from "@/lib/i18n";
import ClaimNoTokenHandler from "./ClaimNoTokenHandler";
import ClaimInitButton from "./ClaimInitButton";
import SpecialistPasswordSignIn from "./SpecialistPasswordSignIn";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function SpecialistClaimPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token?.trim();

  if (!token) {
    // Use getUser() so we only redirect when the session is valid (e.g. after password
    // change Supabase invalidates the session; getSession() can still return stale from cookie
    // and cause redirect loop: claim → dashboard → login → claim).
    const authClient = createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      redirect(specialistDashboardPath());
    }
    const cookieLang = cookies().get("freuly_lang")?.value ?? "";
    const lang: Lang = isSupportedLang(cookieLang) ? cookieLang : "ru";
    const dict = await getDictionary(lang);
    return (
      <div className="min-h-[40vh] px-4 py-10">
        <SpecialistPasswordSignIn lang={lang} dict={dict} />
        <ClaimNoTokenHandler />
      </div>
    );
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

  return (
    <div className="min-h-[40vh] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Продолжить вход</h1>
        <p className="mt-2 text-sm text-gray-600">
          Ссылка подтверждена. Нажмите кнопку ниже, чтобы продолжить безопасный вход в кабинет.
        </p>
        <div className="mt-5">
          <ClaimInitButton token={token} />
        </div>
      </div>
    </div>
  );
}
