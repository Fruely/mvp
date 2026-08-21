import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getPublicSpecialistProfile } from "@/lib/specialists/publicProfile";
import SpecialistProfileClient from "@/components/specialist/SpecialistProfileClient";
import SpecialistProPageClient from "@/components/specialist/pro/SpecialistProPageClient";
import type { Specialist } from "@/components/specialist/SpecialistProfileClient";
import { specialistCanonicalRedirectPath } from "@/lib/specialists/matchPublicSpecialist";
import {
  buildProPageDescription,
  loadPublicProPageBundle,
} from "@/lib/specialists/proPage/resolvePublicProPage";
import { resolveProPageDisplayName } from "@/lib/specialists/proPage/entitlement";
import {
  appendPreservedQuery,
  getSpecialistPublicSlug,
  hreflangSpecialist,
  specialistCanonicalUrl,
} from "@/lib/publicUrls";

interface SpecialistPageProps {
  params: {
    lang: "ru" | "ua" | "de";
    id: string;
  };
  searchParams?: { open?: string };
}

export async function generateMetadata({ params }: SpecialistPageProps): Promise<Metadata> {
  const profile = await getPublicSpecialistProfile(params.id, params.lang);
  const proBundle = profile ? await loadPublicProPageBundle(profile.id) : null;
  const specialist = profile
    ? { id: profile.id, slug: profile.slug }
    : { id: params.id, slug: params.id };
  const canonical = specialistCanonicalUrl(params.lang, specialist);
  const languages = hreflangSpecialist(getSpecialistPublicSlug(specialist));

  const localized = {
    ru: {
      fallbackTitle: "Специалист Freuly",
      fallbackDescription: "Профиль специалиста на Freuly.",
      cityConnector: "в",
      descriptionSuffix: "Услуги, цены, языки и заявка через Freuly.",
    },
    ua: {
      fallbackTitle: "Спеціаліст Freuly",
      fallbackDescription: "Профіль спеціаліста на Freuly.",
      cityConnector: "у",
      descriptionSuffix: "Послуги, ціни, мови та заявка через Freuly.",
    },
    de: {
      fallbackTitle: "Freuly Spezialist",
      fallbackDescription: "Spezialistenprofil auf Freuly.",
      cityConnector: "in",
      descriptionSuffix: "Leistungen, Preise, Sprachen und Anfrage über Freuly.",
    },
  }[params.lang];

  const metadataName =
    proBundle?.renderAsProPage && proBundle.content
      ? resolveProPageDisplayName(profile?.name ?? null, proBundle.content.displayName)
      : profile?.name ?? null;

  const proProfession =
    proBundle?.renderAsProPage && proBundle.content?.professionLabel
      ? proBundle.content.professionLabel
      : profile?.categoryTitle ?? null;

  const title = metadataName
    ? proProfession && profile?.city
      ? `${proProfession} ${localized.cityConnector} ${profile.city} — ${metadataName} | Freuly`
      : proProfession
        ? `${proProfession} — ${metadataName} | Freuly`
        : profile?.categoryTitle && profile?.city
          ? `${profile.categoryTitle} ${localized.cityConnector} ${profile.city} — ${metadataName} | Freuly`
          : `${metadataName} | Freuly`
    : localized.fallbackTitle;

  const proDescription =
    proBundle?.renderAsProPage && proBundle.content
      ? buildProPageDescription({
          name: metadataName,
          professionLabel: proBundle.content.professionLabel,
          categoryTitle: profile?.categoryTitle ?? null,
          city: profile?.city ?? null,
          positioning: proBundle.content.positioning,
          lang: params.lang,
        })
      : null;

  const description =
    proDescription ??
    (profile?.name && profile.categoryTitle && profile.city
      ? `${profile.name} — ${profile.categoryTitle} ${localized.cityConnector} ${profile.city}. ${localized.descriptionSuffix}`
      : localized.fallbackDescription);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      url: canonical,
      title,
      description,
    },
  };
}

function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function toSpecialistJsonLd(
  profile: Awaited<ReturnType<typeof getPublicSpecialistProfile>>,
  lang: "ru" | "ua" | "de",
): Record<string, unknown> | null {
  if (!profile?.name) return null;

  const url = specialistCanonicalUrl(lang, profile);
  const services = profile.services.filter((service) => service.title);

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: profile.name,
    url,
    image: profile.avatarUrl ?? undefined,
    description: profile.description ?? undefined,
    areaServed: profile.city
      ? {
          "@type": "City",
          name: profile.city,
        }
      : undefined,
    address: profile.city
      ? {
          "@type": "PostalAddress",
          addressLocality: profile.city,
          addressCountry: "DE",
        }
      : undefined,
    knowsLanguage: profile.languages,
    serviceType: profile.categoryTitle ?? undefined,
    makesOffer: services.map((service) => {
      const numericPrice =
        typeof service.price_from === "number" && Number.isFinite(service.price_from) && service.price_from > 0
          ? service.price_from
          : undefined;
      return {
        "@type": "Offer",
        name: service.title,
        ...(numericPrice != null ? { price: numericPrice, priceCurrency: service.currency ?? "EUR" } : {}),
        itemOffered: {
          "@type": "Service",
          name: service.title,
        },
      };
    }),
  };
}

function toInitialSpecialist(
  profile: Awaited<ReturnType<typeof getPublicSpecialistProfile>>,
): Specialist | null {
  if (!profile) return null;

  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    description: profile.description ?? undefined,
    avatar_url: profile.avatarUrl,
    photo_focus: profile.photoFocus ?? null,
    city: profile.city,
    category: profile.categoryTitle ?? undefined,
    languages: profile.languages,
    work_format: profile.workFormat,
    created_at: profile.createdAt,
    specialist_services: profile.services.map((service) => ({
      id: service.id,
      title: service.title ?? "",
      price_from: service.price_from ?? 0,
      price_to: service.price_to ?? null,
      currency: service.currency ?? "EUR",
      price_comment: service.price_comment,
      pricing_exception: service.pricing_exception,
      pricing_type: service.pricing_type,
    })),
  };
}

export default async function SpecialistPage({ params, searchParams }: SpecialistPageProps) {
  const profile = await getPublicSpecialistProfile(params.id, params.lang);
  if (profile) {
    const dest = specialistCanonicalRedirectPath(params.lang, params.id, profile);
    if (dest) {
      const query = new URLSearchParams();
      if (searchParams?.open?.trim()) query.set("open", searchParams.open.trim());
      permanentRedirect(appendPreservedQuery(dest, query));
    }
  }

  const proBundle = profile ? await loadPublicProPageBundle(profile.id) : null;
  const jsonLd = toSpecialistJsonLd(profile, params.lang);
  const publicSlug = profile ? getSpecialistPublicSlug(profile) : params.id;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonLd(jsonLd) }}
        />
      ) : null}
      {proBundle?.renderAsProPage && proBundle.content ? (
        <SpecialistProPageClient
          lang={params.lang}
          id={publicSlug}
          proContent={proBundle.content}
          initialSpecialist={toInitialSpecialist(profile)}
        />
      ) : (
        <SpecialistProfileClient
          lang={params.lang}
          id={publicSlug}
          initialSpecialist={toInitialSpecialist(profile)}
        />
      )}
    </>
  );
}
