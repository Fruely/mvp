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
  is_online?: boolean;
  online?: boolean;
  format?: string | null;
  work_format?: string | null;
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
  const aboutText = (specialist.description ?? specialist.bio)?.trim() || "";
  const specializationText = specialist.category || t(dict, "specialist.about", { defaultValue: "Спеціаліст" });
  const galleryPlaceholders = Array.from({ length: 6 }, (_, idx) => idx);
  const workMode = (() => {
    if (typeof specialist.format === "string") {
      const normalized = specialist.format.trim().toLowerCase();
      if (normalized === "online" || normalized === "offline" || normalized === "hybrid") return normalized;
    }
    if (typeof specialist.work_format === "string") {
      const normalized = specialist.work_format.trim().toLowerCase();
      if (normalized === "online" || normalized === "offline" || normalized === "hybrid") return normalized;
    }
    if (typeof specialist.is_online === "boolean") return specialist.is_online ? "online" : "offline";
    if (typeof specialist.online === "boolean") return specialist.online ? "online" : "offline";
    return null;
  })();
  const sectionText = {
    ua: {
      galleryTitle: "Галерея і відео",
      gallerySubtitle: "Розділ підготовлено для майбутнього медіа-контенту",
      servicesTitle: "Послуги",
      servicesSubtitle: "Список послуг з'явиться після наступного оновлення профілю",
      contactsTitle: "Контакти / Формат роботи",
      contactsSubtitle: "Блок підготовлено для майбутньої інтеграції",
      contactsLine1: "Онлайн консультації: за наявності у профілі",
      contactsLine2: "Контактні канали будуть додані після оновлення анкети.",
      readMore: "Читати повністю",
      newBadge: "Новий",
    },
    ru: {
      galleryTitle: "Галерея и видео",
      gallerySubtitle: "Раздел подготовлен для будущего медиа-контента",
      servicesTitle: "Услуги",
      servicesSubtitle: "Список услуг появится после следующего обновления профиля",
      contactsTitle: "Контакты / Формат работы",
      contactsSubtitle: "Блок подготовлен для будущей интеграции",
      contactsLine1: "Онлайн-консультации: при наличии в профиле",
      contactsLine2: "Контактные каналы будут добавлены после обновления анкеты.",
      readMore: "Читать полностью",
      newBadge: "Новый",
    },
    de: {
      galleryTitle: "Galerie und Video",
      gallerySubtitle: "Dieser Bereich ist für künftige Medieninhalte vorbereitet",
      servicesTitle: "Leistungen",
      servicesSubtitle: "Die Liste der Leistungen erscheint nach dem nächsten Profil-Update",
      contactsTitle: "Kontakte / Arbeitsformat",
      contactsSubtitle: "Dieser Block ist für eine zukünftige Integration vorbereitet",
      contactsLine1: "Online-Beratung: falls im Profil vorhanden",
      contactsLine2: "Kontaktkanäle werden nach der Profilaktualisierung ergänzt.",
      readMore: "Vollständig lesen",
      newBadge: "Neu",
    },
  }[lang];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <SpecialistHero
          name={specialist.name}
          avatarUrl={specialist.avatar_url}
          specialization={specializationText}
          languages={Array.isArray(specialist.languages) ? specialist.languages : []}
          workMode={workMode}
          isNew={isNewActive}
          newBadgeLabel={sectionText.newBadge}
          sendRequestLabel={showForm ? t(dict, "specialist.hideForm") : t(dict, "specialist.sendRequest")}
          onSendRequest={() => setShowForm((value) => !value)}
          aboutPreview={aboutText || null}
          aboutHref="#about"
          readMoreLabel={sectionText.readMore}
        />

        {aboutText ? (
          <SectionCard title={t(dict, "specialist.about")} subtitle={lang === "ru" ? "Опыт, подход и ключевые компетенции" : lang === "de" ? "Erfahrung, Ansatz und Schlüsselkompetenzen" : "Досвід, підхід та ключові компетенції"}>
            <div id="about">
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{aboutText}</p>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title={sectionText.galleryTitle} subtitle={sectionText.gallerySubtitle}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {galleryPlaceholders.map((item) => (
              <div
                key={item}
                className="aspect-[4/3] rounded-xl border border-dashed border-slate-300 bg-slate-100/70"
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard title={sectionText.servicesTitle} subtitle={sectionText.servicesSubtitle}>
          <div className="space-y-2">
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
            <div className="h-10 rounded-xl bg-slate-100" />
          </div>
        </SectionCard>

        <SectionCard title={sectionText.contactsTitle} subtitle={sectionText.contactsSubtitle}>
          <div className="space-y-2 text-sm text-gray-700">
            <p>{sectionText.contactsLine1}</p>
            <p>{sectionText.contactsLine2}</p>
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

