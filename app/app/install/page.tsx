import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { installPageHref, parseAudience } from "@/lib/pwa/installLogic";

const LANG_COOKIE = "freuly_lang";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Freuly — Install",
  robots: {
    index: false,
    follow: false,
  },
};

function resolveLang(): Lang {
  const cookieLang = cookies().get(LANG_COOKIE)?.value;
  return cookieLang && isSupportedLang(cookieLang) ? cookieLang : "ua";
}

function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Legacy PWA-shell install URL → localized public guide.
 * Keeps bookmarks/UTM working without coupling to /app shell UI.
 */
export default function AppInstallRedirectPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const lang = resolveLang();
  const audience = parseAudience(firstString(searchParams.audience) ?? null);
  const href = installPageHref(lang, {
    audience,
    source: firstString(searchParams.utm_source) ?? firstString(searchParams.source),
    medium: firstString(searchParams.utm_medium),
    campaign:
      firstString(searchParams.utm_campaign) ?? firstString(searchParams.campaign),
    content: firstString(searchParams.utm_content),
  });

  redirect(href);
}
