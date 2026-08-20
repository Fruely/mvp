import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getPublicSpecialistProfile } from "@/lib/specialists/publicProfile";
import SpecialistProfileClient from "@/components/specialist/SpecialistProfileClient";
import type { Specialist } from "@/components/specialist/SpecialistProfileClient";
import { specialistCanonicalRedirectPath } from "@/lib/specialists/matchPublicSpecialist";
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

  const title = profile?.name
    ? profile.categoryTitle && profile.city
      ? `${profile.categoryTitle} ${localized.cityConnector} ${profile.city} — ${profile.name} | Freuly`
      : `${profile.name} | Freuly`
    : localized.fallbackTitle;

  const description =
    profile?.name && profile.categoryTitle && profile.city
      ? `${profile.name} — ${profile.categoryTitle} ${localized.cityConnector} ${profile.city}. ${localized.descriptionSuffix}`
      : localized.fallbackDescription;

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

  const jsonLd = toSpecialistJsonLd(profile, params.lang);

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonLd(jsonLd) }}
        />
      ) : null}
      <SpecialistProfileClient
        lang={params.lang}
        id={profile ? getSpecialistPublicSlug(profile) : params.id}
        initialSpecialist={toInitialSpecialist(profile)}
      />
    </>
  );
}
