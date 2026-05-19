import type { Metadata } from 'next';
import { getPublicSpecialistProfile } from '@/lib/specialists/publicProfile';
import SpecialistProfileClient from '@/components/specialist/SpecialistProfileClient';
import type { Specialist } from '@/components/specialist/SpecialistProfileClient';

interface SpecialistPageProps {
  params: {
    lang: 'ru' | 'ua' | 'de';
    id: string;
  };
}

export async function generateMetadata({ params }: SpecialistPageProps): Promise<Metadata> {
  const profile = await getPublicSpecialistProfile(params.id, params.lang);
  const identifier = profile?.slug ?? params.id;

  const localized = {
    ru: {
      fallbackTitle: 'Специалист Freuly',
      fallbackDescription: 'Профиль специалиста на Freuly.',
      cityConnector: 'в',
      descriptionSuffix: 'Услуги, цены, языки и заявка через Freuly.',
    },
    ua: {
      fallbackTitle: 'Спеціаліст Freuly',
      fallbackDescription: 'Профіль спеціаліста на Freuly.',
      cityConnector: 'у',
      descriptionSuffix: 'Послуги, ціни, мови та заявка через Freuly.',
    },
    de: {
      fallbackTitle: 'Freuly Spezialist',
      fallbackDescription: 'Spezialistenprofil auf Freuly.',
      cityConnector: 'in',
      descriptionSuffix: 'Leistungen, Preise, Sprachen und Anfrage über Freuly.',
    },
  }[params.lang];

  const title = profile?.name
    ? profile.categoryTitle && profile.city
      ? `${profile.categoryTitle} ${localized.cityConnector} ${profile.city} — ${profile.name} | Freuly`
      : `${profile.name} | Freuly`
    : localized.fallbackTitle;

  const description = profile?.name && profile.categoryTitle && profile.city
    ? `${profile.name} — ${profile.categoryTitle} ${localized.cityConnector} ${profile.city}. ${localized.descriptionSuffix}`
    : localized.fallbackDescription;

  const baseUrl = `https://freuly.de/${params.lang}/specialist/${identifier}`;

  return {
    title,
    description,
    alternates: {
      canonical: baseUrl,
      languages: {
        ru: `https://freuly.de/ru/specialist/${identifier}`,
        uk: `https://freuly.de/ua/specialist/${identifier}`,
        de: `https://freuly.de/de/specialist/${identifier}`,
        'x-default': `https://freuly.de/ru/specialist/${identifier}`,
      },
    },
  };
}

function escapeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function toSpecialistJsonLd(
  profile: Awaited<ReturnType<typeof getPublicSpecialistProfile>>,
  lang: "ru" | "ua" | "de",
  identifier: string
): Record<string, unknown> | null {
  if (!profile?.name) return null;

  const publicId = profile.slug ?? identifier;
  const url = `https://freuly.de/${lang}/specialist/${publicId}`;
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
    makesOffer: services.map((service) => ({
      "@type": "Offer",
      name: service.title,
      price: service.price_from ?? undefined,
      priceCurrency: service.currency ?? "EUR",
      itemOffered: {
        "@type": "Service",
        name: service.title,
      },
    })),
  };
}

function toInitialSpecialist(
  profile: Awaited<ReturnType<typeof getPublicSpecialistProfile>>
): Specialist | null {
  if (!profile) return null;

  return {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    description: profile.description ?? undefined,
    avatar_url: profile.avatarUrl,
    city: profile.city,
    category: profile.categoryTitle ?? undefined,
    languages: profile.languages,
    created_at: profile.createdAt,
    specialist_services: profile.services.map((service) => ({
      id: service.id,
      title: service.title ?? "",
      price_from: service.price_from ?? 0,
      price_to: service.price_to ?? null,
      currency: service.currency ?? "EUR",
    })),
  };
}

export default async function SpecialistPage({ params }: SpecialistPageProps) {
  const profile = await getPublicSpecialistProfile(params.id, params.lang);
  const jsonLd = toSpecialistJsonLd(profile, params.lang, params.id);

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
        id={params.id}
        initialSpecialist={toInitialSpecialist(profile)}
      />
    </>
  );
}
