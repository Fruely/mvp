"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LeadForm from "@/components/LeadForm";
import Image from "next/image";

interface Specialist {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  category: string;
  languages: string[];
  created_at: string;
}

export default function SpecialistPage({ params }: { params: { id: string } }) {
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchSpecialist = async () => {
      try {
        const { data, error } = await supabase
          .from("specialists")
          .select("*")
          .eq("id", params.id);

        if (error) throw error;

        if (!data || data.length === 0) {
          setError("Специалист не найден");
          return;
        }

        setSpecialist(data[0]);
      } catch (err: any) {
        setError(err.message || "Не удалось загрузить данные специалиста");
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialist();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Специалист не найден
          </h1>
          <p className="text-gray-600 mb-6">{error || "Попробуйте позже"}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white rounded-full hover:shadow-lg transition"
          >
            На главную
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Specialist Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-primary to-purple-600 h-32"></div>
          
          <div className="px-6 pb-8">
            {/* Avatar */}
            <div className="flex justify-center -mt-16 mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                  <Image
                    src={specialist.avatar_url || "/avatar-default.png"}
                    alt={specialist.name}
                    width={128}
                    height={128}
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Name & Category */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {specialist.name}
              </h1>
              <p className="text-lg text-primary font-semibold mb-2">
                {specialist.category}
              </p>
              {specialist.languages && specialist.languages.length > 0 && (
                <div className="flex justify-center gap-2 flex-wrap">
                  {specialist.languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                О специалисте
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {specialist.description || "Описание отсутствует"}
              </p>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-8 py-4 bg-gradient-to-r from-primary to-purple-600 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                {showForm ? "Скрыть форму" : "✉️ Отправить заявку"}
              </button>
            </div>
          </div>
        </div>

        {/* Lead Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Отправить заявку
            </h2>
            <LeadForm specialistId={params.id} />
          </div>
        )}
      </div>
    </div>
  );
}
