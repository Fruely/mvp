"use client";

import { useEffect, useMemo, useState } from "react";
import LeadForm from "@/components/LeadForm";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import uaDict from "@/locales/ua.json";
import SectionCard from "@/components/specialist/SectionCard";
import SpecialistHero from "@/components/specialist/SpecialistHero";

interface Specialist {
  id: string;
  name: string;
  description?: string;
  bio?: string;
  avatar_url: string | null;
  category?: string;
  category_id?: string;
  video_url?: string | null;
  gallery_urls?: string[];
  certificate_urls?: string[];
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

  const isNewActive = (() => {
    const createdTs = Date.parse(specialist.created_at);
    if (!Number.isFinite(createdTs)) return false;
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    return Date.now() - createdTs <= twoWeeksMs;
  })();
  const aboutText = (specialist.description ?? specialist.bio) || t(dict, "specialist.noDescription");
  const specializationText = specialist.category || t(dict, "specialist.about", { defaultValue: "Спеціаліст" });
  const galleryPlaceholders = Array.from({ length: 6 }, (_, idx) => idx);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <SpecialistHero
          name={specialist.name}
          avatarUrl={specialist.avatar_url}
          specialization={specializationText}
          languages={Array.isArray(specialist.languages) ? specialist.languages : []}
          isNew={isNewActive}
          sendRequestLabel={showForm ? t(dict, "specialist.hideForm") : t(dict, "specialist.sendRequest")}
          onSendRequest={() => setShowForm((value) => !value)}
        />

        <SectionCard title={t(dict, "specialist.about")} subtitle="Досвід, підхід та ключові компетенції">
          <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{aboutText}</p>
        </SectionCard>

        <SectionCard title="Галерея і відео" subtitle="Розділ підготовлено для майбутнього медіа-контенту">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {galleryPlaceholders.map((item) => (
              <div
                key={item}
                className="aspect-[4/3] rounded-xl border border-dashed border-slate-300 bg-slate-100/70"
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Послуги" subtitle="Список послуг з'явиться після наступного оновлення профілю">
          <div className="space-y-2">
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
          </div>
        </SectionCard>

        <SectionCard title="Контакти / Формат роботи" subtitle="Блок підготовлено для майбутньої інтеграції">
          <div className="space-y-2 text-sm text-gray-700">
            <p>Онлайн консультації: доступно</p>
            <p>Контактні канали будуть додані після оновлення анкети.</p>
          </div>
        </SectionCard>

        {showForm && (
          <section
            id="lead-form"
            className="rounded-2xl border border-black/5 bg-white p-5 shadow-md animate-fadeIn sm:p-6"
          >
            <h2 className="mb-6 text-2xl font-bold text-gray-900">{t(dict, "specialist.sendRequest")}</h2>
            <LeadForm specialistId={params.id} />
          </section>
        )}
      </div>
    </div>
  );
}

