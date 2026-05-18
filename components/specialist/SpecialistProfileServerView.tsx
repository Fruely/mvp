import Image from 'next/image';
import type { PublicSpecialistProfile } from '@/lib/specialists/publicProfile';

interface SpecialistProfileServerViewProps {
  profile: PublicSpecialistProfile;
  lang: 'ru' | 'ua' | 'de';
}

export default function SpecialistProfileServerView({ profile, lang }: SpecialistProfileServerViewProps) {
  const localized = {
    ru: {
      fallbackName: 'Специалист',
      languagesLabel: 'Языки:',
    },
    ua: {
      fallbackName: 'Спеціаліст',
      languagesLabel: 'Мови:',
    },
    de: {
      fallbackName: 'Spezialist',
      languagesLabel: 'Sprachen:',
    },
  }[lang];

  const displayName = profile.name ?? localized.fallbackName;
  const category = profile.categoryTitle ?? null;
  const city = profile.city ?? null;
  const description = profile.description ?? null;
  const languages = Array.isArray(profile.languages) ? profile.languages.filter(Boolean) : [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        {profile.avatarUrl ? (
          <div className="mb-6 flex justify-center">
            <div className="relative h-40 w-40 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              <Image
                src={profile.avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="160px"
                unoptimized
              />
            </div>
          </div>
        ) : null}

        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {displayName}
        </h1>

        {category ? (
          <p className="mt-3 text-sm uppercase tracking-[0.18em] text-slate-500">
            {category}
          </p>
        ) : null}

        {city ? (
          <p className="mt-4 text-base text-slate-700">{city}</p>
        ) : null}

        {languages.length > 0 ? (
          <div className="mt-4 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{localized.languagesLabel}</span>{' '}
            {languages.join(', ')}
          </div>
        ) : null}

        {description ? (
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
