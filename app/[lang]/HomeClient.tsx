"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import HeroSearch from "@/components/HeroSearch";

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
      <HeroSearch
        lang={lang}
        title={t(dict, "hero.title")}
        subtitle={t(dict, "hero.subtitle")}
        heroImageUrl={heroContent.url}
      />

      {/* How it works — calm two-column, TaskRabbit-style */}
      <section className="py-14 md:py-20 bg-[#fafafa]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-8 tracking-tight">
                {t(dict, "home.howItWorks.title")}
              </h2>
              <ul className="space-y-5">
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs font-medium flex items-center justify-center mt-0.5">
                    1
                  </span>
                  <span className="text-gray-700 text-base leading-relaxed">
                    {t(dict, "home.howItWorks.step1")}
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs font-medium flex items-center justify-center mt-0.5">
                    2
                  </span>
                  <span className="text-gray-700 text-base leading-relaxed">
                    {t(dict, "home.howItWorks.step2")}
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 text-gray-600 text-xs font-medium flex items-center justify-center mt-0.5">
                    3
                  </span>
                  <span className="text-gray-700 text-base leading-relaxed">
                    {t(dict, "home.howItWorks.step3")}
                  </span>
                </li>
              </ul>
              <p className="mt-8 text-sm text-gray-500">
                <Link href={`/${lang}/become-specialist`} className="text-gray-600 hover:text-gray-900 underline underline-offset-2">
                  {t(dict, "home.howItWorks.specialistCta")}
                </Link>
              </p>
            </div>
            <div className="relative aspect-[4/5] max-h-[480px] lg:max-h-none rounded-lg overflow-hidden bg-gray-200">
              {/* Replace src with your own image: realistic person, natural light, home interior. Example Unsplash placeholder. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=720&q=80"
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mosaic Section (dynamic) */}
      <section id="categories" className="py-12 md:py-16 bg-white">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-12">
              {mosaicContent.images.map((img, idx) => {
                const categoryId = img.category_id || "";
                const categoryTitle = t(dict, `categories.${categoryId}`, {
                  defaultValue: t(dict, "categories.default"),
                });

                return (
                  <Link 
                    key={`${img.url}-${idx}`} 
                    href={categoryId ? `/${lang}/category/${categoryId}` : "#"}
                    className="block mx-auto"
                  >
                    <div className="group relative w-full max-w-[200px] md:max-w-[220px] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white">
                      {/* Square Image Container */}
                      <div
                        className="relative w-full aspect-square"
                        style={{ aspectRatio: "1 / 1" }}
                      >
                        <Image
                          unoptimized
                          src={img.url}
                          alt={img.alt || `mosaic-${idx}`}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="mosaic-card-img object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to placeholder SVG on error
                            const target = e.target as HTMLImageElement;
                            target.src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        
                        {/* Gradient Overlay with absolute positioning */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none">
                          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                            <span className="text-white text-sm font-semibold drop-shadow-lg line-clamp-1">
                              {categoryTitle}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Fallback hover-scale (если Tailwind не сгенерил scale-[1.02]) */}
                      <style jsx>{`
                        .group:hover :global(.mosaic-card-img) {
                          transform: scale(1.02);
                        }
                      `}</style>
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

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg shadow">
          {error}
        </div>
      )}
    </div>
  );
}

