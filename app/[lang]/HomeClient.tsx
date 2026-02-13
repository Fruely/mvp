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

type TextImageBlockContent = {
  title?: string;
  text?: string;
  url?: string;
};

type Block = {
  key: string;
  type: "image" | "mosaic";
  content: ImageBlockContent | MosaicBlockContent | TextImageBlockContent;
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
  const textImage = useMemo(
    () => blocks.find((b) => b.key === "homepage_text_image"),
    [blocks]
  );

  const heroContent = (hero?.content as ImageBlockContent) || {};
  const mosaicContent = (mosaic?.content as MosaicBlockContent) || {};
  const textImageContent = (textImage?.content as TextImageBlockContent) || {};

  const placeholderCategories = [
    { id: "psychologists", icon: "🧠" },
    { id: "masseurs", icon: "💆" },
    { id: "tutors", icon: "📚" },
  ];

  console.log("=== DEBUG START ===");
  console.log("BLOCKS STATE:", blocks);
  console.log("BLOCKS LENGTH:", blocks?.length);
  console.log(
    "TEXT IMAGE FIND:",
    blocks?.find((b) => b.key === "homepage_text_image")
  );
  console.log("TEXT IMAGE MEMO:", textImage);
  console.log("=== DEBUG END ===");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {!blocks.length && (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      )}
      {blocks.length > 0 && (
        <>
      <HeroSearch
        lang={lang}
        title={t(dict, "hero.title")}
        subtitle={t(dict, "hero.subtitle")}
        heroImageUrl={heroContent.url}
      />

      <section className="bg-white py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-2xl md:text-3xl font-medium text-gray-900 leading-snug">
            Вы объясняете — но не так.
          </p>

          <p className="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed">
            Сомневаетесь — но не можете задать вопрос.<br />
            Откладываете важное — потому что боитесь быть непонятым.
          </p>

          <p className="mt-10 text-xl md:text-2xl text-gray-900 font-semibold">
            Поэтому <span className="text-primary">Freuly</span> соединяет вас
            со специалистами, которые говорят на вашем родном языке.
          </p>
        </div>
      </section>

      {true && (
        <section className="py-24 overflow-x-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="relative min-h-[520px] overflow-hidden rounded-3xl bg-white">

              {textImageContent?.url && (
                <>
                  {/* Layer 1: Background image (z-0) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={textImageContent.url}
                    alt={textImageContent.title || ""}
                    className="absolute inset-0 w-full h-full object-cover object-right rounded-3xl z-0"
                  />
                  {/* Layer 2: Gradient overlay (z-1) */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent pointer-events-none z-[1]"
                    aria-hidden
                  />
                </>
              )}

              {/* Layer 3: Floating card (z-10) */}
              <div className="absolute left-6 top-6 w-[calc(80%-1.6rem)] md:left-8 md:top-8 md:w-auto max-w-[22.4rem] bg-white rounded-2xl shadow-2xl p-[1.6rem] z-10">

                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  {textImageContent?.title || t(dict, "home.howItWorks.title")}
                </h2>

                <div className="space-y-6 text-gray-700">

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                      1
                    </div>
                    <p>{t(dict, "home.howItWorks.step1")}</p>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                      2
                    </div>
                    <p>{t(dict, "home.howItWorks.step2")}</p>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                      3
                    </div>
                    <p>{t(dict, "home.howItWorks.step3")}</p>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </section>
      )}

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
                            const target = e.target as HTMLImageElement;
                            target.src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none">
                          <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                            <span className="text-white text-sm font-semibold drop-shadow-lg line-clamp-1">
                              {categoryTitle}
                            </span>
                          </div>
                        </div>
                      </div>
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

        </>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg shadow">
          {error}
        </div>
      )}
    </div>
  );
}

