import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSafeNextPath } from "@/lib/auth/safeNextPath";
import { resolveLoginLang } from "@/lib/auth/loginLang";
import SpecialistPasswordSignIn from "@/app/specialist/claim/SpecialistPasswordSignIn";
import { specialistDashboardPath } from "@/lib/specialists/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { getDictionary, t, type Lang } from "@/lib/i18n";

function loginLangFromRequest(safeNext: string | null): Lang {
  const cookieLang = cookies().get("freuly_lang")?.value ?? "";
  return resolveLoginLang({ cookieLang, safeNext });
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
  const lang = loginLangFromRequest(null);
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
  const lang = loginLangFromRequest(safeNext);
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
