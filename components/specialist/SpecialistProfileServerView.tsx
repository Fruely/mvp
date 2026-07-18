import type { PublicSpecialistProfile } from '@/lib/specialists/publicProfile';
import SpecialistAvatarImage from '@/components/specialist/SpecialistAvatarImage';
import { getPublicSpecialistLocation } from '@/lib/specialists/geography';

interface SpecialistProfileServerViewProps {
  profile: PublicSpecialistProfile;
  lang: 'ru' | 'ua' | 'de';
}

export default function SpecialistProfileServerView({ profile, lang }: SpecialistProfileServerViewProps) {
    const localized = {
      ru: {
        fallbackName: 'Специалист',
        languagesLabel: 'Языки:',
        onlineLabel: 'Онлайн',
      },
      ua: {
        fallbackName: 'Спеціаліст',
        languagesLabel: 'Мови:',
        onlineLabel: 'Онлайн',
      },
      de: {
        fallbackName: 'Spezialist',
        languagesLabel: 'Sprachen:',
        onlineLabel: 'Online',
      },
    }[lang];

    const displayName = profile.name ?? localized.fallbackName;
    const category = profile.categoryTitle ?? null;
    const locationLabel = getPublicSpecialistLocation({
      workFormat: profile.workFormat,
      city: profile.city,
      postalCode: profile.postalCode,
      onlineLabel: localized.onlineLabel,
    }).label;
    const description = profile.description ?? null;
    const languages = Array.isArray(profile.languages) ? profile.languages.filter(Boolean) : [];

    return (
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-6 max-w-sm">
            <SpecialistAvatarImage src={profile.avatarUrl} alt={displayName} />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {displayName}
          </h1>

          {category ? (
            <p className="mt-3 text-sm uppercase tracking-[0.18em] text-slate-500">
              {category}
            </p>
          ) : null}

          {locationLabel ? (
            <p className="mt-4 text-base text-slate-700">{locationLabel}</p>
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
