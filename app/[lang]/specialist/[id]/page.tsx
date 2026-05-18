import type { Metadata } from 'next';
import { getPublicSpecialistProfile } from '@/lib/specialists/publicProfile';
import SpecialistProfileClient from '@/components/specialist/SpecialistProfileClient';

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

export default function SpecialistPage({ params }: SpecialistPageProps) {
  return <SpecialistProfileClient lang={params.lang} id={params.id} />;
}
