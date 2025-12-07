"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
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
}

export default function CategoryPage({ params }: { params: { id: string } }) {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = getSupabase();

        const { data: categoryData, error: categoryError } = await (supabase
          .from("categories")
          .select("id, slug, name")
          .eq("slug", params.id)
          .single() as any);

        if (categoryError || !categoryData) {
          notFound();
        }

        setCategory(categoryData);

        const { data: specialistsData, error: specialistsError } = await (supabase
          .from("specialists")
          .select("id, name, bio, avatar_url, category_id")
          .eq("category_id", categoryData.id) as any);

        if (specialistsError) throw specialistsError;

        setSpecialists(specialistsData || []);
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block"
          >
            ← На главную
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            {category?.name}
          </h1>
          <p className="text-lg text-gray-600 mt-2">
            Найден {specialists.length} {specialists.length === 1 ? "специалист" : "специалистов"}
          </p>
        </div>

        {specialists.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Специалисты отсутствуют</h2>
            <p className="text-gray-600 mb-6">
              К сожалению, в этой категории пока нет специалистов
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
            >
              Вернуться на главную
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialists.map((specialist) => (
              <Link
                key={specialist.id}
                href={`/specialist/${specialist.id}`}
                className="group"
              >
                <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden h-full flex flex-col">
                  <div className="relative w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
                    {specialist.avatar_url ? (
                      <Image
                        src={specialist.avatar_url}
                        alt={specialist.name}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-6xl">👤</div>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                      {specialist.name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-3 flex-grow">
                      {specialist.bio || "Описание отсутствует"}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <span className="text-blue-600 font-semibold text-sm">
                        Перейти к профилю →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
