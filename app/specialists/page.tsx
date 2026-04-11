import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSpecialistUrl } from "@/lib/urls";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { normalizeLang } from "@/lib/normalizeLang";

export const dynamic = "force-dynamic";

const UI_LANGS = ["ua", "ru", "de"] as const;
type UiLang = (typeof UI_LANGS)[number];

function toUiLang(lang: string): UiLang {
  const lower = lang.toLowerCase();
  if (lower === "de") return "de";
  if (lower === "ru") return "ru";
  if (lower === "uk") return "ua";
  return "ua";
}

type Specialist = {
  id: string;
  slug?: string | null;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  category_slug: string | null;
  category_title: string | null;
  category_title_ru: string | null;
  category_title_de: string | null;
  category_title_ua: string | null;
  languages: string[];
  work_format: string;
  postal_code: string | null;
  /** From local radius search API; omitted for online/all lists. */
  distance?: number;
};

type SpecialistsSearchResponse = {
  data: Specialist[];
  error: string | null;
  mode?: string;
  radius?: number;
};

async function fetchSpecialists(
  lang: string,
  place: string,
  q: string | null,
  category: string | null
): Promise<SpecialistsSearchResponse> {
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  if (place) params.set("place", place);
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://freuly.de";
  const url = `${baseUrl}/api/specialists/search?${params.toString()}`;
  console.log("FETCH URL:", url);

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { data: [], error: "Network error" };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    return { data: [], error: "Invalid response" };
  }

  const radiusRaw = json?.radius;
  const radius =
    typeof radiusRaw === "number" && Number.isFinite(radiusRaw)
      ? radiusRaw
      : undefined;

  return {
    data: Array.isArray(json?.data) ? json.data : [],
    error: json?.error || null,
    mode: typeof json?.mode === "string" ? json.mode : undefined,
    radius,
  };
}

type SearchParams = { lang?: string; place?: string; q?: string; category?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const lang = searchParams?.lang?.trim();
  const place = searchParams?.place?.trim();
  if (!lang || !place) {
    return { title: "Specialists | Freuly" };
  }
  return {
    title: `Specialists · ${place} | Freuly`,
    description: `Find specialists by language and location.`,
  };
}

export default async function SpecialistsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const lang = searchParams?.lang?.trim();
  const place = searchParams?.place?.trim();
  const q = searchParams?.q?.trim() || null;
  const category = searchParams?.category?.trim() || null;

  if (!lang || !place) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Missing search parameters
          </h1>
          <p className="text-gray-600 mb-6">
            Language and location are required. Please start your search from the
            homepage.
          </p>
          <Link
            href="/ua"
            className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const result = await fetchSpecialists(lang, place, q, category);
  const specialists = Array.isArray(result?.data) ? result.data : [];
  const error = result?.error || null;
  const searchMode = result.mode;
  const searchRadius = result.radius;
  const uiLang = toUiLang(lang);

  if (error && specialists.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href={`/${uiLang}`}
            className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Back to search
          </Link>
        </div>
      </div>
    );
  }

  const empty = specialists.length === 0;

  if (empty) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="text-5xl mb-4" aria-hidden>
            🔍
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            No specialists found for the selected language in this area.
          </h1>
          <p className="text-gray-600 mb-8">
            Try changing the language or expanding your location to see more
            results.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/${uiLang}`}
              className="inline-block px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              Change language or location
            </Link>
            <Link
              href={`/${uiLang}`}
              className="inline-block px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
            >
              Back to search
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const localSpecialists = specialists.filter(
    (s) => s.work_format !== "online" && s.postal_code === place
  );
  const onlineSpecialists = specialists.filter(
    (s) => s.work_format === "online" || s.work_format === "hybrid"
  );
  const otherSpecialists = specialists.filter(
    (s) =>
      !localSpecialists.includes(s) && !onlineSpecialists.includes(s)
  );

  const renderCard = (s: Specialist) => {
            const categoryLabel = getCategoryTitle(
              {
                title: s.category_title,
                title_ru: s.category_title_ru,
                title_de: s.category_title_de,
                title_ua: s.category_title_ua,
              },
              normalizeLang(uiLang)
            ) || "Category";
            const hasCategory = Boolean(categoryLabel && categoryLabel !== "Category");

            return (
            <li key={s.id}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row gap-5 p-6">
                  <div className="flex-shrink-0">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-gray-100">
                      {s.avatar_url ? (
                        <Image
                          src={s.avatar_url}
                          alt={s.name}
                          fill
                          sizes="128px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center text-4xl"
                          aria-hidden
                        >
                          👤
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">{s.name}</h2>
                    {hasCategory && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {categoryLabel}
                      </p>
                    )}
                    <p className="text-gray-600 text-sm leading-relaxed mt-2 line-clamp-2">
                      {s.bio || "Specialist profile."}
                    </p>
                    {s.postal_code && (
                      <p className="text-xs text-textSecondary mt-2">
                        {s.postal_code}
                        {s.work_format && s.work_format !== "online" && (
                          <span> · {s.work_format}</span>
                        )}
                      </p>
                    )}
                    {typeof s.distance === "number" && Number.isFinite(s.distance) && (
                      <p className="text-xs text-textSecondary mt-1">
                        {s.distance} км от вас
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-4">
                      <Link
                        href={`${getSpecialistUrl(uiLang, s)}?open=form`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl shadow-soft hover:bg-gray-800 transition"
                      >
                        Send request
                      </Link>
                      <Link
                        href={getSpecialistUrl(uiLang, s)}
                        className="inline-flex items-center gap-1 px-4 py-2 text-gray-700 text-sm font-medium hover:text-gray-900 transition"
                      >
                        View profile →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </li>
            );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/${uiLang}`}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium inline-flex items-center gap-1 mb-4"
          >
            ← Back to search
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Specialists
          </h1>
          <p className="text-gray-600 mt-1">
            {specialists.length} {specialists.length === 1 ? "result" : "results"}{" "}
            for language &quot;{lang}&quot; in &quot;{place}&quot;
            {q ? ` matching "${q}"` : ""}.
          </p>
        </div>

        {searchMode === "local" &&
          typeof searchRadius === "number" &&
          Number.isFinite(searchRadius) && (
            <p className="text-sm text-gray-600 mb-6">
              Найдено специалистов в радиусе {searchRadius} км
            </p>
          )}

        {localSpecialists.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Рядом с вами</h2>
            <ul className="space-y-4 mb-8">
              {localSpecialists.map(renderCard)}
            </ul>
          </>
        )}

        {onlineSpecialists.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Работают онлайн</h2>
            <ul className="space-y-4 mb-8">
              {onlineSpecialists.map(renderCard)}
            </ul>
          </>
        )}

        {otherSpecialists.length > 0 && (
          <ul className="space-y-4">
            {otherSpecialists.map(renderCard)}
          </ul>
        )}
      </div>
    </div>
  );
}
