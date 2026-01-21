"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type ImageBlockContent = {
  url?: string;
  title?: string;
  subtitle?: string;
  alt?: string;
};

type MosaicImage = { url: string; alt?: string; category_id?: string };

type MosaicBlockContent = {
  title?: string;
  subtitle?: string;
  images?: MosaicImage[];
};

type Block = {
  key: string;
  type: "image" | "mosaic";
  content: ImageBlockContent | MosaicBlockContent;
};

export default function HomeClient({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBlocks() {
      try {
        const res = await fetch("/api/site-blocks", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Ошибка загрузки блоков");
        setBlocks(json.blocks || []);
      } catch (e: any) {
        setError(e.message || "Ошибка загрузки блоков");
      }
    }

    loadBlocks();

    // Быстрая реакция на публикацию из админки
    const handler = () => loadBlocks();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const hero = useMemo(() => blocks.find((b) => b.key === "homepage_hero"), [blocks]);
  const mosaic = useMemo(() => blocks.find((b) => b.key === "homepage_mosaic"), [blocks]);

  const heroContent = (hero?.content as ImageBlockContent) || {};
  const mosaicContent = (mosaic?.content as MosaicBlockContent) || {};

  const placeholderCategories = [
    { id: "psychologists", icon: "🧠" },
    { id: "masseurs", icon: "💆" },
    { id: "tutors", icon: "📚" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Section (dynamic) */}
      <section className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {t(dict, "hero.title")}
              </h1>
              <p className="text-lg text-gray-700 mb-6">
                {t(dict, "hero.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#categories"
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 shadow-lg hover:shadow-xl transition text-center cursor-pointer"
                >
                  {t(dict, "hero.primaryCta")}
                </a>
                <Link
                  href={`/${lang}/become-specialist`}
                  className="px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-full hover:bg-blue-50 transition text-center"
                >
                  {t(dict, "hero.secondaryCta")}
                </Link>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
              {heroContent.url ? (
                <Image
                  unoptimized
                  src={heroContent.url}
                  alt={heroContent.alt || heroContent.title || "Hero"}
                  width={512}
                  height={512}
                  className="max-w-md rounded-3xl shadow-2xl border border-blue-100 h-auto"
                />
              ) : (
                <div className="relative w-80 h-80">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-6xl shadow-lg">
                      🌍
                    </div>
                  </div>
                  <div className="absolute top-0 left-8 animate-bounce" style={{ animationDelay: "0s" }}>
                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-blue-200">
                      🇩🇪
                    </div>
                    <p className="text-center text-sm font-semibold text-gray-700 mt-2">Deutsch</p>
                  </div>
                  <div className="absolute top-32 right-4 animate-bounce" style={{ animationDelay: "0.2s" }}>
                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-purple-200">
                      🇷🇺
                    </div>
                    <p className="text-center text-sm font-semibold text-gray-700 mt-2">Русский</p>
                  </div>
                  <div className="absolute bottom-8 left-12 animate-bounce" style={{ animationDelay: "0.4s" }}>
                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-pink-200">
                      🇺🇦
                    </div>
                    <p className="text-center text-sm font-semibold text-gray-700 mt-2">Українська</p>
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

      {/* Mosaic Section (dynamic) */}
      <section id="categories" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t(dict, "home.categories.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t(dict, "home.categories.subtitle")}
            </p>
          </div>

          {mosaicContent.images && mosaicContent.images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
              {mosaicContent.images.map((img, idx) => {
                const categoryId = img.category_id || "";
                const categoryTitle = t(dict, `categories.${categoryId}`, {
                  defaultValue: t(dict, "categories.default"),
                });

                return (
                  <Link key={`${img.url}-${idx}`} href={categoryId ? `/${lang}/category/${categoryId}` : "#"}>
                    <div className="group rounded-2xl overflow-hidden shadow hover:shadow-lg transition cursor-pointer bg-white">
                      <div className="aspect-[4/3] w-full overflow-hidden">
                        <Image
                          unoptimized
                          src={img.url}
                          alt={img.alt || `mosaic-${idx}`}
                          width={800}
                          height={600}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="bg-gradient-to-t from-black/70 via-black/30 to-transparent -mt-12 h-14 flex items-end px-3 py-2">
                        <span className="text-white text-sm font-semibold drop-shadow">{categoryTitle}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {placeholderCategories.map((category) => (
                <Link key={category.id} href={`/${lang}/category/${category.id}`}>
                  <div className="group bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border border-gray-100">
                    <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center text-4xl shadow-md group-hover:shadow-lg transition">
                      {category.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
                      {t(dict, `categories.${category.id}`, {
                        defaultValue: t(dict, "categories.default"),
                      })}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <div className="text-2xl font-bold text-blue-600">FREULY</div>
            <div className="text-sm text-gray-600 mt-2 max-w-sm">
              Freuly — место, где люди находят профессионалов, говорящих на их языке.
            </div>
          </div>

          <div className="flex gap-10">
            <div>
              <h4 className="font-semibold mb-2">Компания</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  <Link href={`/${lang}/about`} className="hover:text-blue-600">
                    О нас
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/support`} className="hover:text-blue-600">
                    Поддержка
                  </Link>
                </li>
                <li>
                  <Link href={`/${lang}/become-specialist`} className="hover:text-blue-600">
                    Для специалистов
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Контакты</h4>
              <p className="text-sm text-gray-600">info@freuly.example</p>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">© 2025 Freuly. Все права защищены.</div>
      </footer>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg shadow">
          {error}
        </div>
      )}
    </div>
  );
}

