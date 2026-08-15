import { cookies } from "next/headers";
import Link from "next/link";
import { Search } from "lucide-react";
import { getDictionary, isSupportedLang, langFromCookie, t, type Lang } from "@/lib/i18n";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APP_SHELL_CATEGORY_SLUGS, APP_SHELL_COPY } from "@/lib/app-shell/copy";
import { categoryHref, homeHref, serviceSearchHref } from "@/lib/app-shell/links";
import AppShellHeader from "@/components/app-shell/AppShellHeader";
import AppShellActions from "@/components/app-shell/AppShellActions";
import AppShellCategoryGrid from "@/components/app-shell/AppShellCategoryGrid";
import AppShellSpecialistCta from "@/components/app-shell/AppShellSpecialistCta";
import InstallFreuly from "@/components/pwa/InstallFreuly";

const LANG_COOKIE = "freuly_lang";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Freuly",
  robots: {
    index: false,
    follow: false,
  },
};

function resolveLang(): Lang {
  const cookieLang = cookies().get(LANG_COOKIE)?.value;
  return langFromCookie(cookieLang);
}

/**
 * Detects whether the current visitor is an authenticated specialist WITHOUT
 * ever redirecting a guest to /login (unlike getCurrentUserAndSpecialist).
 * Guests and non-specialist clients simply see the "log in as specialist" CTA
 * and keep using search freely.
 */
async function detectSpecialist(): Promise<boolean> {
  try {
    const supabase = createSupabaseServerComponentClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return false;

    // Server-only service client (never exposed to the browser); read-only
    // existence check, no insert / no redirect side effects.
    const service = createSupabaseServerClient();
    const { data: specialist } = await service
      .from("specialists")
      .select("id")
      .eq("user_id", data.user.id)
      .neq("status", "blocked")
      .maybeSingle();

    return Boolean(specialist);
  } catch {
    return false;
  }
}

export default async function AppShellPage() {
  const lang = resolveLang();
  const copy = APP_SHELL_COPY[lang];
  const dict = await getDictionary(lang);
  const isSpecialist = await detectSpecialist();

  const categories = APP_SHELL_CATEGORY_SLUGS.map((slug) => ({
    slug,
    label: t(dict, `categories.${slug}`),
    href: categoryHref(lang, slug),
  }));

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-gradient-to-b from-[#EEF1FF] via-white to-[#FFF6EC]">
      <AppShellHeader lang={lang} languageSwitcherLabel={copy.languageSwitcherLabel} />

      <main className="flex flex-1 flex-col gap-6 px-4 py-5">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#4B50E6] via-[#5A5FEF] to-[#7A5CF0] p-6 text-white shadow-[0_14px_34px_-16px_rgba(75,80,230,0.65)]">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
            {copy.heroBadge}
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-tight">{copy.primaryActionTitle}</h1>
          <p className="mt-1.5 text-sm text-white/85">{copy.primaryActionSubtitle}</p>
          <Link
            href={serviceSearchHref(lang)}
            className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#3B3FBF] shadow-sm transition-colors hover:bg-[#FFF6EC] sm:w-auto"
          >
            <Search className="h-5 w-5" aria-hidden />
            {copy.primaryActionCta}
          </Link>
        </section>

        <AppShellActions lang={lang} copy={copy} />

        <AppShellCategoryGrid title={copy.categoriesTitle} categories={categories} />

        <AppShellSpecialistCta lang={lang} copy={copy} isSpecialist={isSpecialist} />

        <InstallFreuly
          lang={lang}
          audience={isSpecialist ? "specialist" : "client"}
          placement="app_shell"
          variant="compact"
        />
      </main>

      <footer className="px-4 py-5 text-center">
        <Link
          href={homeHref(lang)}
          className="text-sm font-medium text-[#4B50E6] hover:underline"
        >
          {copy.fullSiteLink}
        </Link>
      </footer>
    </div>
  );
}
