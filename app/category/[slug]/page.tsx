"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabase } from "@/lib/supabaseClient";

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
        const response = await fetch(`/api/specialists/list?category_id=${catData.id}`);
        const result = await response.json();
        if (response.ok) {
          setSpecialists(result.data || []);
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
          <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">На главную</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">← На главную</Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">{category.name || category.title}</h1>
          <p className="text-lg text-gray-600 mt-2">Найден {specialists.length} {specialists.length === 1 ? "специалист" : "специалистов"}</p>
        </div>

        {specialists.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Специалисты отсутствуют</h2>
            <p className="text-gray-600 mb-6">К сожалению, в этой категории пока нет специалистов</p>
            <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition">Вернуться на главную</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {specialists.map((specialist) => (
              <div key={specialist.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200">
                <div className="flex flex-col md:flex-row">
                  {/* Left: Avatar */}
                  <div className="relative w-full md:w-64 h-56 md:h-auto bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex-shrink-0">
                    {specialist.avatar_url ? (
                      <Image 
                        src={specialist.avatar_url} 
                        alt={specialist.name} 
                        fill 
                        sizes="(max-width: 768px) 100vw, 256px" 
                        unoptimized 
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-white/40 flex items-center justify-center text-6xl">
                          👤
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Info */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {specialist.name}
                      </h3>
                      <p className="text-gray-600 text-base leading-relaxed line-clamp-3 mb-4">
                        {specialist.bio || "Опытный специалист готов помочь вам"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <Link 
                        href={`/specialist/${specialist.id}?open=form`} 
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-full hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all"
                      >
                        ✉️ Оставить заявку
                      </Link>
                      <Link 
                        href={`/specialist/${specialist.id}`} 
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        Подробнее →
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
