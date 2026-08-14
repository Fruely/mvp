import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSafeNextPath } from "@/lib/auth/safeNextPath";
import SpecialistPasswordSignIn from "@/app/specialist/claim/SpecialistPasswordSignIn";
import { specialistDashboardPath } from "@/lib/specialists/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";

function loginLangFromCookie(): Lang {
  const cookieLang = cookies().get("freuly_lang")?.value ?? "";
  return isSupportedLang(cookieLang) ? cookieLang : "ru";
}

/**
 * Stable login route:
 * - not logged in -> show login form
 * - logged in with valid `next` -> requested internal path
 * - logged in with specialist -> dashboard
 * - logged in without specialist -> claim flow
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = loginLangFromCookie();
  const dict = await getDictionary(lang);
  return {
    title: `${t(dict, "login.title")} | Freuly`,
    description: t(dict, "login.subtitle"),
  };
}

type Props = {
  searchParams?: { next?: string } | Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const resolved = await Promise.resolve(searchParams ?? {});
  const safeNext = resolveSafeNextPath(
    typeof resolved.next === "string" ? resolved.next : null
  );

  const authClient = createSupabaseServerComponentClient();
  const serviceClient = createServiceClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (user) {
    if (safeNext) {
      redirect(safeNext);
    }

    const { data: specialist } = await serviceClient
      .from("specialists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (specialist?.id) {
      redirect(specialistDashboardPath());
    }

    redirect("/specialist/claim");
  }

  const allowPartnerSignUp = Boolean(safeNext?.includes("/partners/"));
  const lang = loginLangFromCookie();
  const dict = await getDictionary(lang);

  return (
    <div className="min-h-[40vh] px-4 py-10">
      <SpecialistPasswordSignIn
        lang={lang}
        dict={dict}
        nextPath={safeNext}
        allowPartnerSignUp={allowPartnerSignUp}
      />
    </div>
  );
}
