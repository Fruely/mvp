import Link from "next/link";
import Image from "next/image";

export type Specialist = {
  id: string;
  name: string;
  category: string;
  city: string;
  postal_code?: string;
  languages: string[];
  bio: string;
  avatar_url?: string;
};

interface Props {
  specialists: Specialist[];
  isLoading: boolean;
}

export default function SpecialistsList({ specialists, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-48 rounded-2xl bg-gray-100 animate-pulse border border-gray-200"
          />
        ))}
      </div>
    );
  }

  if (!specialists.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-700">
        Ничего не найдено. Попробуйте изменить фильтры.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {specialists.map((specialist) => (
        <div
          key={specialist.id}
          className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 flex-none overflow-hidden rounded-full bg-gray-100">
              {specialist.avatar_url ? (
                <Image
                  unoptimized
                  src={specialist.avatar_url}
                  alt={specialist.name}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg text-gray-500">
                  {specialist.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-gray-900">{specialist.name}</p>
              <p className="text-sm text-gray-600">{specialist.category}</p>
              <p className="text-xs text-gray-500">
                {specialist.city}
                {specialist.postal_code ? `, ${specialist.postal_code}` : ""}
              </p>
            </div>
          </div>

          <p className="mt-4 line-clamp-3 text-sm text-gray-700">{specialist.bio}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {specialist.languages.map((lang) => (
              <span
                key={lang}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
              >
                {lang}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-4">
            <Link
              href={`/specialist/${specialist.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              Подробнее
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
