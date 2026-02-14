"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import uaDict from "@/locales/ua.json";

interface Specialist {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  category_id: string;
}

interface Category {
  id: string;
  slug: string;
  title: string;
  specialists_count: number;
  is_clickable: boolean;
}

interface ParentChildCategory {
  id: string;
  slug: string;
  title: string;
  specialists_count: number;
  is_clickable: boolean;
}

interface ParentCategory {
  id: string;
  slug: string;
  title: string;
  specialists_count: number;
  is_clickable: boolean;
  children: ParentChildCategory[];
}

export default function CategoryPage({ params }: { params: { lang: string; slug: string } }) {
  const { slug } = params;
  const lang = params.lang as Lang;
  const langPrefix = `/${lang}`;

  const [dict, setDict] = useState<Dictionary>(uaDict as unknown as Dictionary);

  const [category, setCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<ParentCategory | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getDictionary(lang)
      .then((d) => {
        if (!cancelled) setDict(d);
      })
      .catch(() => {
        if (!cancelled) setDict(uaDict as unknown as Dictionary);
      });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const parentCategoriesRes = await fetch(
          "/api/specialists/categories?mode=parents&include_children=1",
          { cache: "no-store" }
        );
        const parentCategoriesJson = await parentCategoriesRes.json();
        const parentCategories = Array.isArray(parentCategoriesJson?.data)
          ? parentCategoriesJson.data
          : [];
        const parentData = parentCategories.find(
          (c: any) => c && typeof c.slug === "string" && c.slug === slug
        );

        if (parentData) {
          const normalizedParent: ParentCategory = {
            id: String(parentData.id),
            slug: String(parentData.slug),
            title: String(parentData.title || parentData.slug),
            specialists_count: Number(parentData.specialists_count || 0),
            is_clickable: Boolean(parentData.is_clickable),
            children: (Array.isArray(parentData.children) ? parentData.children : [])
              .filter(
                (child: any) =>
                  child &&
                  typeof child.id === "string" &&
                  typeof child.slug === "string"
              )
              .map((child: any) => ({
                id: String(child.id),
                slug: String(child.slug),
                title: String(child.title || child.slug),
                specialists_count: Number(child.specialists_count || 0),
                is_clickable: Boolean(child.is_clickable),
              })),
          };

          setParentCategory(normalizedParent);
          setCategory(null);
          setSpecialists([]);
          setLoading(false);
          return;
        }

        const categoriesRes = await fetch("/api/specialists/categories", {
          cache: "no-store",
        });
        const categoriesJson = await categoriesRes.json();
        const categories = Array.isArray(categoriesJson?.data)
          ? categoriesJson.data
          : [];
        const catData = categories.find(
          (c: any) => c && typeof c.slug === "string" && c.slug === slug
        );

        if (!catData) {
          setLoading(false);
          return;
        }

        const normalizedCategory: Category = {
          id: String(catData.id),
          slug: String(catData.slug),
          title: String(catData.title || catData.slug),
          specialists_count: Number(catData.specialists_count || 0),
          is_clickable: Boolean(catData.is_clickable),
        };

        setCategory(normalizedCategory);
        setParentCategory(null);

        if (!normalizedCategory.is_clickable) {
          setSpecialists([]);
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/specialists/list?category_id=${normalizedCategory.id}`
        );
        const result = await response.json();
        if (response.ok) {
          setSpecialists(Array.isArray(result.data) ? result.data : []);
        } else {
          console.error("Failed to fetch specialists:", result.error);
          setSpecialists([]);
        }
      } catch (err) {
        console.error("Error fetching category data:", err);
        setSpecialists([]);
        setCategory(null);
        setParentCategory(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  const foundText = useMemo(() => {
    const visibleCount = category?.is_clickable
      ? specialists.length
      : (category?.specialists_count ?? 0);
    const template = (t as any)(dict, "category.found", {
      count: visibleCount,
    }) as string;
    return String(template).replace(/\{\{\s*count\s*\}\}/g, String(visibleCount));
  }, [dict, specialists.length, category]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t(dict, "category.loading")}</p>
        </div>
      </div>
    );
  }

  if (!category) {
    if (parentCategory) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <Link href={langPrefix} className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
                {t(dict, "common.backToHome")}
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{parentCategory.title}</h1>
              <p className="text-lg text-gray-600 mt-2">
                {t(dict, "category.parent.subtitle")}
              </p>
            </div>

            {parentCategory.children.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl mx-auto">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {t(dict, "category.parent.empty.title")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t(dict, "category.parent.empty.subtitle")}
                </p>
                <Link
                  href={langPrefix}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                >
                  {t(dict, "common.toHome")}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {parentCategory.children.map((child) => (
                  <div
                    key={child.id}
                    className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${
                      child.is_clickable ? "hover:shadow-md transition" : "opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">{child.title}</h3>
                      {!child.is_clickable ? (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                          {t(dict, "common.soon")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {t(dict, "category.parent.found").replace(
                        /\{\{\s*count\s*\}\}/g,
                        String(child.specialists_count)
                      )}
                    </p>
                    {child.is_clickable ? (
                      <Link
                        href={`/${lang}/category/${child.slug}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {t(dict, "common.more")}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center text-gray-400 font-medium">
                        {t(dict, "category.comingSoon.title")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t(dict, "category.notFound")}</h1>
          <Link
            href={langPrefix}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
          >
            {t(dict, "common.toHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <Link href={langPrefix} className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
            {t(dict, "common.backToHome")}
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{category.title}</h1>
          <p className="text-lg text-gray-600 mt-2">{foundText}</p>
        </div>

        {!category.is_clickable ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t(dict, "category.comingSoon.title")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t(dict, "category.comingSoon.subtitle")}
            </p>
            <Link
              href={langPrefix}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
            >
              {t(dict, "common.toHome")}
            </Link>
          </div>
        ) : specialists.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t(dict, "category.empty.title")}</h2>
            <p className="text-gray-600 mb-6">{t(dict, "category.empty.subtitle")}</p>
            <Link
              href={langPrefix}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
            >
              {t(dict, "common.toHome")}
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {specialists.map((specialist) => (
              <div
                key={specialist.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row gap-5 p-6">
                  {/* Left: Round Avatar */}
                  <div className="flex-shrink-0">
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto sm:mx-0">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 border-4 border-white shadow-lg">
                        {specialist.avatar_url ? (
                          <Image
                            src={specialist.avatar_url}
                            alt={specialist.name}
                            fill
                            sizes="144px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-5xl">
                            👤
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{specialist.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                            {t(dict, "specialist.badge")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                      {specialist.bio || t(dict, "specialist.fallbackDescription")}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/${lang}/specialist/${specialist.id}?open=form`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all"
                      >
                        <span>✉️</span>
                        {t(dict, "specialist.cta")}
                      </Link>
                      <Link
                        href={`/${lang}/specialist/${specialist.id}`}
                        className="inline-flex items-center gap-1 px-4 py-2.5 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        {t(dict, "common.more")}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

