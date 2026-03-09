"use client";

import { useState, useTransition, FormEvent } from "react";

type ProfileEditorProps = {
  initialProfile: {
    about_me: string;
    services: string;
    how_i_work: string;
    experience: string;
    city: string;
    radius_km: number | null;
    categories: string[];
  };
};

const MAX_TEXT_LENGTH = 1000;

export default function ProfileEditor({ initialProfile }: ProfileEditorProps) {
  const [aboutMe, setAboutMe] = useState(initialProfile.about_me ?? "");
  const [services, setServices] = useState(initialProfile.services ?? "");
  const [howIWork, setHowIWork] = useState(initialProfile.how_i_work ?? "");
  const [experience, setExperience] = useState(initialProfile.experience ?? "");
  const [city, setCity] = useState(initialProfile.city ?? "");
  const [radiusKm, setRadiusKm] = useState<string>(
    initialProfile.radius_km != null ? String(initialProfile.radius_km) : ""
  );
  const [categoriesInput, setCategoriesInput] = useState(
    (initialProfile.categories || []).join(", ")
  );

  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const categories =
      categoriesInput
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean) || [];

    const payload = {
      about_me: aboutMe,
      services,
      how_i_work: howIWork,
      experience,
      city,
      radius_km: radiusKm ? Number(radiusKm) : null,
      categories,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/specialist/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let message = "Не удалось сохранить профиль. Попробуйте ещё раз.";
          try {
            const data = await res.json();
            if (data?.error && typeof data.error === "string") {
              message = data.error;
            }
          } catch {
            // ignore
          }
          setErrorMessage(message);
          return;
        }

        setSuccessMessage("Профиль сохранён.");
      } catch {
        setErrorMessage("Не удалось сохранить профиль. Попробуйте ещё раз.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Обо мне</span>
            <span className="text-xs text-textSecondary">
              {aboutMe.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
          <textarea
            className="min-h-[96px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            maxLength={MAX_TEXT_LENGTH}
          />
          <p className="text-xs text-textSecondary">
            Кратко расскажите о себе и своём подходе.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Услуги</span>
            <span className="text-xs text-textSecondary">
              {services.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
          <textarea
            className="min-h-[96px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            value={services}
            onChange={(e) => setServices(e.target.value)}
            maxLength={MAX_TEXT_LENGTH}
          />
          <p className="text-xs text-textSecondary">
            Перечислите основные направления и форматы вашей работы.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Как я работаю</span>
            <span className="text-xs text-textSecondary">
              {howIWork.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
          <textarea
            className="min-h-[96px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            value={howIWork}
            onChange={(e) => setHowIWork(e.target.value)}
            maxLength={MAX_TEXT_LENGTH}
          />
          <p className="text-xs text-textSecondary">
            Опишите формат сессий, продолжительность и особенности работы.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
            <span>Опыт</span>
            <span className="text-xs text-textSecondary">
              {experience.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
          <textarea
            className="min-h-[96px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            maxLength={MAX_TEXT_LENGTH}
          />
          <p className="text-xs text-textSecondary">
            Укажите ваш опыт, образование и дополнительные квалификации.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Город
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Например: Берлин"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Радиус работы (км)
          </label>
          <input
            type="number"
            min={0}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            placeholder="Например: 10"
          />
          <p className="text-xs text-textSecondary">
            Если вы работаете только онлайн, можете оставить поле пустым или
            указать 0.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Категории
        </label>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          value={categoriesInput}
          onChange={(e) => setCategoriesInput(e.target.value)}
          placeholder="Например: психотерапия, коучинг, семейные консультации"
        />
        <p className="text-xs text-textSecondary">
          Укажите несколько категорий через запятую. Это поможет клиентам
          находить вас по нужным темам.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-x-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Сохранение..." : "Сохранить профиль"}
          </button>
        </div>

        <div className="flex-1 text-right">
          {successMessage && (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          )}
          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </form>
  );
}
