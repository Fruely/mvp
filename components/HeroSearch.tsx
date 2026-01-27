"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type FilterOption = { id: string; name: string };

type HeroSearchProps = {
  lang: string;
  title?: string;
  subtitle?: string;
  heroImageUrl?: string | null;
};

const defaultTitle = "Найди специалиста на своём языке в Германии";
const defaultSubtitle =
  "Психологи, услуги, обучение и помощь — без языкового барьера";

export default function HeroSearch({
  lang,
  title = defaultTitle,
  subtitle = defaultSubtitle,
  heroImageUrl,
}: HeroSearchProps) {
  const router = useRouter();

  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [languages, setLanguages] = useState<FilterOption[]>([]);
  const [postalCodes, setPostalCodes] = useState<FilterOption[]>([]);

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) {
          setCategories(
            data.categories.map((c: { slug: string; title: string }) => ({
              id: c.slug,
              name: c.title,
            }))
          );
        }
        if (data.languages) {
          setLanguages(
            data.languages.map((l: string) => ({ id: l, name: l }))
          );
        }
        if (data.postal_codes) {
          setPostalCodes(
            data.postal_codes.map((p: string) => ({ id: p, name: p }))
          );
        }
      })
      .catch(() => {});
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (language) params.set("language", language);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    router.push(`/${lang}/search?${params.toString()}`);
  }

  return (
    <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: title, subtitle, filter */}
          <div className="order-2 md:order-1">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 leading-tight">
              {title}
            </h1>
            <p className="text-lg text-gray-700 mb-6">{subtitle}</p>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-0 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full py-1.5 text-sm bg-transparent border-none outline-none text-gray-800"
                >
                  <option value="">Язык</option>
                  {languages.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full py-1.5 text-sm bg-transparent border-none outline-none text-gray-800"
                >
                  <option value="">Категория</option>
                  {categories.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full py-1.5 text-sm bg-transparent border-none outline-none text-gray-800"
                >
                  <option value="">Город / индекс</option>
                  {postalCodes.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="w-full sm:w-auto px-5 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
                >
                  Поиск
                </button>
              </div>
            </div>
          </div>

          {/* Right: hero image */}
          <div className="order-1 md:order-2 hidden md:flex items-center justify-center">
            {heroImageUrl ? (
              <Image
                unoptimized
                src={heroImageUrl}
                alt=""
                width={512}
                height={512}
                className="max-w-md rounded-3xl shadow-2xl border border-blue-100 h-auto w-full object-cover"
              />
            ) : (
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-6xl shadow-lg">
                    🌍
                  </div>
                </div>
                <div
                  className="absolute top-0 left-8 animate-bounce"
                  style={{ animationDelay: "0s" }}
                >
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-blue-200" />
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">
                    Deutsch
                  </p>
                </div>
                <div
                  className="absolute top-32 right-4 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-purple-200" />
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">
                    Русский
                  </p>
                </div>
                <div
                  className="absolute bottom-8 left-12 animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                >
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-pink-200" />
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">
                    Українська
                  </p>
                </div>
                <div className="absolute bottom-0 right-8 animate-pulse">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-3xl shadow-lg">
                    👨‍⚕️
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
