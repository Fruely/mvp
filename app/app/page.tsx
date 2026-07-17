import { cookies } from "next/headers";
import Link from "next/link";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APP_SHELL_CATEGORY_SLUGS, APP_SHELL_COPY } from "@/lib/app-shell/copy";
import { categoryHref, homeHref } from "@/lib/app-shell/links";
import AppShellHeader from "@/components/app-shell/AppShellHeader";
import AppShellActions from "@/components/app-shell/AppShellActions";
import AppShellCategoryGrid from "@/components/app-shell/AppShellCategoryGrid";
import AppShellSpecialistCta from "@/components/app-shell/AppShellSpecialistCta";

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
  return cookieLang && isSupportedLang(cookieLang) ? cookieLang : "ua";
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
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-white">
      <AppShellHeader lang={lang} languageSwitcherLabel={copy.languageSwitcherLabel} />

      <main className="flex flex-1 flex-col gap-8 px-4 py-6">
        <section>
          <h1 className="text-2xl font-bold text-gray-900">{copy.primaryActionTitle}</h1>
          <p className="mt-1 text-sm text-gray-600">{copy.primaryActionSubtitle}</p>
        </section>

        <AppShellActions lang={lang} copy={copy} />

        <AppShellCategoryGrid title={copy.categoriesTitle} categories={categories} />

        <AppShellSpecialistCta lang={lang} copy={copy} isSpecialist={isSpecialist} />
      </main>

      <footer className="border-t border-gray-100 px-4 py-5 text-center">
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
