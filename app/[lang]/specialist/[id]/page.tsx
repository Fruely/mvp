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

  return (
    <SpecialistProfileClient
      lang={params.lang}
      id={params.id}
      initialSpecialist={toInitialSpecialist(profile)}
    />
  );
}
