import Link from "next/link";
import type { SeoSpecialistCard } from "@/lib/servicesSeo";
import { getSpecialistUrl } from "@/lib/urls";

export default function ServiceLanding({
  title,
  description,
  canonicalPath,
  specialists,
}: {
  title: string;
  description: string;
  canonicalPath: string;
  specialists: SeoSpecialistCard[];
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: `https://freuly.de${canonicalPath}`,
    mainEntity: specialists.map((specialist) => ({
      "@type": "Person",
      name: specialist.name?.trim() ? specialist.name : "Специалист",
      url: `https://freuly.de${getSpecialistUrl("ru", specialist)}`,
      address: specialist.city || undefined,
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-600">{description}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialists.map((specialist) => (
          <Link
            key={specialist.id}
            href={getSpecialistUrl("ru", specialist)}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow"
          >
            <div className="text-base font-semibold text-gray-900">{specialist.name?.trim() ? specialist.name : "Специалист"}</div>
            <p className="mt-1 text-sm text-gray-600">{specialist.city || "Online"}</p>
            <p className="mt-2 line-clamp-2 text-sm text-gray-500">{specialist.services.slice(0, 3).join(", ")}</p>
          </Link>
        ))}
      </div>

      {specialists.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          Пока нет специалистов по этому фильтру. Попробуйте расширить параметры.
        </div>
      ) : null}

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
