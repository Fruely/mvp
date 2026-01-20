"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "@/lib/supabaseClient";
import { usePathname } from "next/navigation";

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
  name: string;
  title?: string;
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const pathname = usePathname() || "/";
  const langPrefix = useMemo(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg === "ua" || seg === "ru" || seg === "de" ? `/${seg}` : "/ua";
  }, [pathname]);

  const [category, setCategory] = useState<Category | null>(null);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const supabase = getSupabase();

      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!catData) {
        setLoading(false);
        return;
      }

      setCategory(catData);

      try {
        console.log("[CategoryPage] Loading specialists for category:", { slug, categoryId: catData.id });
        const response = await fetch(`/api/specialists/list?category_id=${catData.id}`);
        const result = await response.json();
        
        // Enhanced logging for diagnosis
        console.log("[CategoryPage] API response full:", result);
        console.log("[CategoryPage] response.data type:", typeof result.data, "is_array:", Array.isArray(result.data));
        console.log("[CategoryPage] response.data length:", result.data?.length);
        
        const specsToSet = result.data || [];
        console.log("[CategoryPage] About to setSpecialists with:", { count: specsToSet.length, sample: specsToSet.slice(0, 1) });
        
        if (response.ok) {
          setSpecialists(specsToSet);
          console.log("[CategoryPage] setSpecialists completed, state should update");
        } else {
          console.error("Failed to fetch specialists:", result.error);
        }
      } catch (err) {
        console.error("Error fetching specialists:", err);
      }

      setLoading(false);
    };

    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Категория не найдена</h1>
          <Link href={langPrefix} className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">На главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <Link href={langPrefix} className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">← На главную</Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{category.name || category.title}</h1>
          <p className="text-lg text-gray-600 mt-2">Найден {specialists.length} {specialists.length === 1 ? "специалист" : "специалистов"}</p>
        </div>

        {specialists.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Специалисты отсутствуют</h2>
            <p className="text-gray-600 mb-6">К сожалению, в этой категории пока нет специалистов</p>
            <Link href={langPrefix} className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">Вернуться на главную</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {specialists.map((specialist) => (
              <div key={specialist.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden">
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
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {specialist.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                            Репетитор
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                      {specialist.bio || "Профессиональный специалист с большим опытом работы"}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link 
                        href={`/specialist/${specialist.id}?open=form`} 
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all"
                      >
                        <span>✉️</span>
                        Оставить заявку
                      </Link>
                      <Link 
                        href={`/specialist/${specialist.id}`} 
                        className="inline-flex items-center gap-1 px-4 py-2.5 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Подробнее
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
