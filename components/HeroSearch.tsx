"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const LANG_OPTIONS = [
  { value: "de", label: "de" },
  { value: "ru", label: "ru" },
  { value: "uk", label: "uk" },
  { value: "tr", label: "tr" },
  { value: "ar", label: "ar" },
  { value: "en", label: "en" },
] as const;

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
  lang: _lang,
  title = defaultTitle,
  subtitle = defaultSubtitle,
  heroImageUrl,
}: HeroSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [place, setPlace] = useState("");
  const [lang, setLang] = useState("");

  const canSubmit = Boolean(lang && place.trim());

  function handleRedirect() {
    if (!canSubmit) return;
    const params = new URLSearchParams({
      lang,
      place: place.trim(),
    });
    if (q?.trim()) {
      params.set("q", q.trim());
    }
    router.push(`/specialists?${params.toString()}`);
  }

  return (
    <section className="bg-gradient-to-b from-[#F3F6FC] to-[#E9EFF9] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: title, subtitle, intent form */}
          <div className="order-2 md:order-1">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 leading-tight">
              {title}
            </h1>
            <p className="text-lg text-gray-700 mb-6">{subtitle}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRedirect();
              }}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-0 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm min-w-0"
            >
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3 min-w-0 flex items-center">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Кого вы ищете? (массажист, психолог, репетитор…)"
                  className="w-full min-h-[2.25rem] py-1.5 text-sm bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                />
              </div>
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3 min-w-0 flex items-center">
                <input
                  type="text"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="PLZ oder Stadt"
                  className="w-full min-h-[2.25rem] py-1.5 text-sm bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                />
              </div>
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3 min-w-0 flex items-center">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full min-h-[2.25rem] py-1.5 text-sm bg-transparent border-none outline-none text-gray-800"
                >
                  <option value="">Язык</option>
                  {LANG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-3 flex items-center shrink-0">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full sm:w-auto px-5 py-2 min-h-[2.25rem] text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-900"
                >
                  Поиск
                </button>
              </div>
            </form>
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
