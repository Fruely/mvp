"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import LeadForm from "@/components/LeadForm";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import uaDict from "@/locales/ua.json";

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
  const searchParams = useSearchParams();
  const pathname = usePathname() || "/";
  const lang = useMemo<Lang>(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg === "ua" || seg === "ru" || seg === "de" ? (seg as Lang) : "ua";
  }, [pathname]);
  const langPrefix = `/${lang}`;

  const [dict, setDict] = useState<Dictionary>(uaDict as unknown as Dictionary);

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
    const fetchSpecialist = async () => {
      try {
        const response = await fetch(`/api/specialists/${params.id}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || null);
          return;
        }

        setSpecialist(result.data);
      } catch (err: any) {
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialist();
  }, [params.id]);

  // Auto-open form by query param
  useEffect(() => {
    const open = searchParams?.get("open");
    if (open === "form") {
      setShowForm(true);
      // Scroll to form after opening
      setTimeout(() => {
        const el = document.getElementById("lead-form");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t(dict, "specialist.loading")}</p>
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
            {t(dict, "specialist.notFound")}
          </h1>
          <p className="text-gray-600 mb-6">{error || t(dict, "common.tryLater")}</p>
          <Link
            href={langPrefix}
            className="inline-block px-6 py-3 bg-primary text-white rounded-full hover:shadow-lg transition"
          >
            {t(dict, "common.toHome")}
          </Link>
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
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  {specialist.avatar_url ? (
                    <Image
                      src={specialist.avatar_url}
                      alt={specialist.name}
                      width={128}
                      height={128}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">👤</span>
                  )}
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
                {t(dict, "specialist.about")}
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {specialist.description || t(dict, "specialist.noDescription")}
              </p>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-8 py-4 bg-gradient-to-r from-primary to-purple-600 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                {showForm ? t(dict, "specialist.hideForm") : t(dict, "specialist.sendRequest")}
              </button>
            </div>
          </div>
        </div>

        {/* Lead Form */}
        {showForm && (
          <div id="lead-form" className="bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {t(dict, "specialist.sendRequest")}
            </h2>
            <LeadForm specialistId={params.id} />
          </div>
        )}
      </div>
    </div>
  );
}
