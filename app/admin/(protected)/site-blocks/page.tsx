"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type ImageBlockContent = {
  url?: string;
  title?: string;
  subtitle?: string;
  alt?: string;
};

type MosaicImage = { url: string; alt?: string; category_id?: string };
type CategoryOption = { id: string; slug: string; title: string | null };

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

const DEFAULT_CATEGORY_LABEL = "Категория";

export default function AdminSiteBlocksPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const TOKEN_STORAGE_KEY = "ADMIN_API_TOKEN";

  // Проверка аутентификации при загрузке
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(TOKEN_STORAGE_KEY)
        : null;
    if (!token) {
      router.push("/admin/login");
      return;
    }
    setAuthed(true);
    fetchBlocks();
    fetchCategories();
  }, [router]);

  const hero = useMemo(() => blocks.find((b) => b.key === "homepage_hero"), [
    blocks,
  ]);
  const mosaic = useMemo(
    () => blocks.find((b) => b.key === "homepage_mosaic"),
    [blocks]
  );

  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [heroAlt, setHeroAlt] = useState("");

  const [mosaicTitle, setMosaicTitle] = useState("");
  const [mosaicSubtitle, setMosaicSubtitle] = useState("");
  const [mosaicImages, setMosaicImages] = useState<MosaicImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    if (hero && hero.content) {
      const c = hero.content as ImageBlockContent;
      setHeroTitle(c.title || "");
      setHeroSubtitle(c.subtitle || "");
      setHeroUrl(c.url || "");
      setHeroAlt(c.alt || "");
    }
    if (mosaic && mosaic.content) {
      const c = mosaic.content as MosaicBlockContent;
      setMosaicTitle(c.title || "");
      setMosaicSubtitle(c.subtitle || "");
      setMosaicImages(c.images || []);
    }
  }, [hero, mosaic]);

  async function fetchBlocks() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/site-blocks", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setBlocks(json.blocks || []);
      } else {
        setMessage(json.error || "Ошибка загрузки блоков");
      }
    } catch (e: any) {
      setMessage(e.message || "Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const [parentsRes, childrenRes] = await Promise.all([
        fetch("/api/specialists/categories?mode=parents&min_count=0", {
          cache: "no-store",
        }),
        fetch("/api/specialists/categories?min_count=0", {
          cache: "no-store",
        }),
      ]);

      const [parentsJson, childrenJson] = await Promise.all([
        parentsRes.json(),
        childrenRes.json(),
      ]);

      if (!parentsRes.ok) {
        setMessage(parentsJson.error || "Ошибка загрузки родительских категорий");
        return;
      }
      if (!childrenRes.ok) {
        setMessage(childrenJson.error || "Ошибка загрузки категорий");
        return;
      }

      const normalize = (source: any): CategoryOption[] =>
        (Array.isArray(source) ? source : [])
          .map((item: any) => ({
            id: String(item.id || ""),
            slug: String(item.slug || ""),
            title: item.title ? String(item.title) : null,
          }))
          .filter((item: CategoryOption) => item.id && item.slug);

      const parentCategories = normalize(parentsJson.data);
      const childCategories = normalize(childrenJson.data);
      const merged = [...parentCategories, ...childCategories].filter(
        (item, index, list) =>
          list.findIndex((candidate) => candidate.slug === item.slug) === index
      );

      setCategories(merged);
    } catch (e: any) {
      setMessage(e.message || "Ошибка загрузки категорий");
    }
  }

  async function uploadImage(file: File): Promise<string | null> {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setMessage("Токен отсутствует. Войдите заново.");
      router.push("/admin/login");
      return null;
    }

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/site-blocks/upload", {
      method: "POST",
      headers: { "x-admin-token": token },
      body: fd,
    });
    const json = await res.json();
    if (res.status === 401) {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}
      setMessage("Токен недействителен. Войдите заново.");
      router.push("/admin/login");
      return null;
    }
    if (!res.ok) {
      setMessage(json.error || "Ошибка загрузки изображения");
      return null;
    }
    return json.url as string;
  }

  async function saveBlock(key: string, type: "image" | "mosaic", content: any) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setMessage("Токен отсутствует. Войдите заново.");
      router.push("/admin/login");
      throw new Error("Missing admin token");
    }

    const res = await fetch("/api/site-blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
      body: JSON.stringify({ key, type, content }),
    });
    const json = await res.json();
    if (res.status === 401) {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}
      setMessage("Токен недействителен. Войдите заново.");
      router.push("/admin/login");
      throw new Error("Unauthorized");
    }
    if (!res.ok) throw new Error(json.error || "Ошибка сохранения блока");
    return json.block as Block;
  }

  async function onLogout() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_login_time");
    } catch {}
    router.push("/admin/login");
  }

  async function onSaveHero() {
    setLoading(true);
    setMessage(null);
    try {
      const content: ImageBlockContent = {
        title: heroTitle,
        subtitle: heroSubtitle,
        url: heroUrl,
        alt: heroAlt,
      };
      await saveBlock("homepage_hero", "image", content);
      await fetchBlocks();
      try {
        localStorage.setItem("site_blocks_refresh", String(Date.now()));
      } catch {}
      setMessage("Hero сохранён");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onSaveMosaic() {
    setLoading(true);
    setMessage(null);
    try {
      const content: MosaicBlockContent = {
        title: mosaicTitle,
        subtitle: mosaicSubtitle,
        images: mosaicImages,
      };
      await saveBlock("homepage_mosaic", "mosaic", content);
      await fetchBlocks();
      try {
        localStorage.setItem("site_blocks_refresh", String(Date.now()));
      } catch {}
      setMessage("Mosaic сохранён");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  const categoryNameBySlug = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.slug,
          category.title || DEFAULT_CATEGORY_LABEL,
        ] as const)
      ),
    [categories]
  );

  const categorySlugById = useMemo(
    () =>
      new Map(categories.map((category) => [category.id, category.slug] as const)),
    [categories]
  );

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Управление визуальными блоками сайта
          </h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            Выход
          </button>
        </div>

        <div className="space-y-8">
          {/* HERO BLOCK */}
          <section className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Homepage Hero</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Заголовок
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                />

                <label className="block text-sm font-medium mb-1 mt-4">
                  Подзаголовок
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                />

                <label className="block text-sm font-medium mb-1 mt-4">
                  Alt-текст
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={heroAlt}
                  onChange={(e) => setHeroAlt(e.target.value)}
                />

                <label className="block text-sm font-medium mb-1 mt-4">
                  URL изображения
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={heroUrl}
                  onChange={(e) => setHeroUrl(e.target.value)}
                  placeholder="Можно вставить прямую ссылку"
                />

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Загрузить изображение
                  </label>
                  <input
                    type="file"
                    accept="image/*,.svg"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setLoading(true);
                        const url = await uploadImage(f);
                        if (url) setHeroUrl(url);
                        setLoading(false);
                      }
                    }}
                  />
                </div>

                <button
                  onClick={onSaveHero}
                  className="mt-6 w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  💾 Сохранить Hero
                </button>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">Превью</div>
                <div className="flex items-center justify-center">
                  {heroUrl ? (
                    <Image
                      unoptimized
                      src={heroUrl}
                      alt={heroAlt || heroTitle || "Hero"}
                      width={256}
                      height={256}
                      className="w-64 h-64 object-cover rounded-xl border"
                    />
                  ) : (
                    <div className="w-64 h-64 rounded-xl bg-gray-100 border flex items-center justify-center text-gray-500">
                      Нет изображения
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* MOSAIC BLOCK */}
          <section className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Homepage Mosaic</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Заголовок
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={mosaicTitle}
                  onChange={(e) => setMosaicTitle(e.target.value)}
                />

                <label className="block text-sm font-medium mb-1 mt-4">
                  Подзаголовок
                </label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={mosaicSubtitle}
                  onChange={(e) => setMosaicSubtitle(e.target.value)}
                />

                <label className="block text-sm font-medium mb-1 mt-4">
                  Выберите категорию для нового изображения
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">-- Выберите категорию --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.title || DEFAULT_CATEGORY_LABEL}
                    </option>
                  ))}
                </select>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Добавить изображение в мозаику
                  </label>
                  <input
                    type="file"
                    accept="image/*,.svg"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setLoading(true);
                        const url = await uploadImage(f);
                        if (url) {
                          if (!selectedCategory) {
                            setMessage(
                              "Пожалуйста, выберите категорию перед загрузкой"
                            );
                            setLoading(false);
                            return;
                          }
                          setMosaicImages((prev) => [
                            ...prev,
                            { url, category_id: selectedCategory },
                          ]);
                          setSelectedCategory("");
                        }
                        setLoading(false);
                      }
                    }}
                  />
                </div>

                <button
                  onClick={onSaveMosaic}
                  className="mt-6 w-full px-6 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  💾 Сохранить мозаику
                </button>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">Превью</div>
                {mosaicImages.length === 0 ? (
                  <div className="w-64 h-64 rounded-xl bg-gray-100 border flex items-center justify-center text-gray-500">
                    Нет изображений
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 w-64">
                    {mosaicImages.map((img, idx) => {
                      const slugOrId =
                        typeof img.category_id === "string"
                          ? img.category_id
                          : "";
                      const normalizedSlug =
                        categorySlugById.get(slugOrId) || slugOrId;
                      const catName =
                        categoryNameBySlug.get(normalizedSlug) || DEFAULT_CATEGORY_LABEL;
                      const hasKnownCategory = categories.some(
                        (category) => category.slug === normalizedSlug
                      );
                      return (
                        <div key={`${img.url}-${idx}`} className="relative group">
                          <div className="relative">
                            <Image
                              unoptimized
                              src={img.url}
                              alt={img.alt || `mosaic-${idx}`}
                              width={128}
                              height={128}
                              className="w-32 h-32 object-cover rounded-lg border"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition">
                              {catName}
                            </div>
                          </div>
                          <div className="mt-1">
                            <select
                              className="w-32 border rounded px-1 py-1 text-[11px]"
                              value={normalizedSlug}
                              onChange={(e) => {
                                const nextCategorySlug = e.target.value;
                                setMosaicImages((prev) =>
                                  prev.map((item, itemIdx) =>
                                    itemIdx === idx
                                      ? { ...item, category_id: nextCategorySlug }
                                      : item
                                  )
                                );
                              }}
                            >
                              {!hasKnownCategory && normalizedSlug ? (
                                <option value={normalizedSlug}>{catName}</option>
                              ) : null}
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.slug}>
                                  {cat.title || DEFAULT_CATEGORY_LABEL}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs hover:bg-red-700"
                            onClick={() =>
                              setMosaicImages((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            aria-label="Удалить"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {loading && <div className="mt-4 text-sm text-gray-500">Загрузка...</div>}
        {message && (
          <div className="mt-3 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

