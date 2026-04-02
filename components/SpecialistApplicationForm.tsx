"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import type { Dictionary } from "@/lib/i18n";

type SpecialistApplicationFormProps = {
  lang: string;
  dict: Dictionary;
};

type Category = {
  id: string;
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
};

type FormData = {
  email: string;
  name: string;
  phone: string;
  category_id: string;
  stoir_number: string;
  about_short: string;
  terms_accepted: boolean;
};

export default function SpecialistApplicationForm({
  lang,
  dict,
}: SpecialistApplicationFormProps) {
  const pathname = usePathname() || "/";
  const langPrefix =
    pathname.split("/").filter(Boolean)[0] === "ua" ||
    pathname.split("/").filter(Boolean)[0] === "ru" ||
    pathname.split("/").filter(Boolean)[0] === "de"
      ? `/${pathname.split("/").filter(Boolean)[0]}`
      : "/ua";

  const [formData, setFormData] = useState<FormData>({
    email: "",
    name: "",
    phone: "",
    category_id: "",
    stoir_number: "",
    about_short: "",
    terms_accepted: false,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormData | "proof", string>>
  >({});
  const photoInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/specialists/categories")
      .then((res) => res.json())
      .then((json: { data?: Category[] }) => setCategories(json.data || []))
      .catch(() => setCategories([]));
  }, []);

  const getCategoryLabel = (category: Category) =>
    getCategoryTitle(
      category,
      lang === "ru" || lang === "ua" || lang === "de" ? lang : "ru"
    );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (fieldErrors[name as keyof FormData]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name as keyof FormData];
        return next;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoFile(e.target.files?.[0] || null);
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofFile(e.target.files?.[0] || null);
    if (fieldErrors.proof) setFieldErrors((prev) => ({ ...prev, proof: undefined }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData | "proof", string>> = {};

    if (!formData.email.trim()) {
      errors.email = t(dict, "application.errors.emailRequired", { defaultValue: "Email обов'язковий" });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t(dict, "application.errors.emailInvalid", { defaultValue: "Невірний формат email" });
    }
    if (!formData.name.trim()) {
      errors.name = t(dict, "application.errors.nameRequired", { defaultValue: "Ім'я обов'язкове" });
    }
    if (!formData.phone.trim()) {
      errors.phone = t(dict, "application.errors.phoneRequired", { defaultValue: "Телефон обов'язковий" });
    }
    if (!formData.category_id.trim()) {
      errors.category_id = t(dict, "application.errors.categoryRequired", { defaultValue: "Оберіть категорію" });
    }
    if (!proofFile) {
      errors.proof = t(dict, "application.errors.proofRequired", { defaultValue: "Завантажте документ (PDF або зображення)" });
    }
    if (!formData.terms_accepted) {
      errors.terms_accepted = t(dict, "application.errors.termsRequired", { defaultValue: "Потрібно прийняти умови" });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;

    setLoading(true);
    try {
      let proof_link: string | null = null;
      if (proofFile) {
        const form = new FormData();
        form.append("file", proofFile);
        const uploadRes = await fetch("/api/specialists/upload-proof", { method: "POST", body: form });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error || "Не вдалося завантажити документ");
        proof_link = uploadJson.url || null;
        if (!proof_link) throw new Error("Не отримано посилання на документ");
      }

      let photo_base64: string | null = null;
      if (photoFile) {
        const reader = new FileReader();
        photo_base64 = await new Promise<string | null>((resolve) => {
          reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(photoFile);
        });
      }

      const payload = {
        email: formData.email.trim(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        category_id: formData.category_id.trim(),
        stoir_number: formData.stoir_number.trim() || null,
        about_short: formData.about_short.trim() || null,
        terms_accepted: formData.terms_accepted,
        photo_base64: photo_base64 || null,
        proof_link,
      };

      const response = await fetch("/api/specialists/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t(dict, "application.errors.submitFailed", { defaultValue: "Помилка при відправці заявки" }));
      }

      setSuccess(true);
      setFormData({
        email: "",
        name: "",
        phone: "",
        category_id: "",
        stoir_number: "",
        about_short: "",
        terms_accepted: false,
      });
      setPhotoFile(null);
      setProofFile(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      if (proofInputRef.current) proofInputRef.current.value = "";
      setFieldErrors({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t(dict, "application.errors.submitFailed", { defaultValue: "Помилка при відправці заявки" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href={langPrefix}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block"
          >
            {t(dict, "common.backToHome", { defaultValue: "← На головну" })}
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t(dict, "application.title", {
              defaultValue: "Подати заявку як спеціаліст Freuly",
            })}
          </h1>
          <p className="text-lg text-gray-600">
            {t(dict, "application.subtitle", {
              defaultValue:
                "Freuly — B2B-платформа. Ми працюємо лише з реальними спеціалістами та розглядаємо кожну заявку вручну.",
            })}
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg">
            <p className="font-semibold mb-1">
              {t(dict, "application.success.title", {
                defaultValue: "Дякуємо за заявку!",
              })}
            </p>
            <p>
              {t(dict, "application.success.message", {
                defaultValue:
                  "Ми надіслали лист для підтвердження email. Після підтвердження ваша заявка буде розглянута вручну.",
              })}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded-lg">
            ✗ {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-8 space-y-6"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.email", {
                defaultValue: "Email (робочий)",
              })}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t(dict, "application.emailPlaceholder", {
                defaultValue: "ivan@example.com",
              })}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                fieldErrors.email ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.name", { defaultValue: "Ім'я" })} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Іван Петров"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${fieldErrors.name ? "border-red-500" : "border-gray-300"}`}
              required
            />
            {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.phone", { defaultValue: "Телефон" })} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+49 123 456789"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${fieldErrors.phone ? "border-red-500" : "border-gray-300"}`}
              required
            />
            {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.category", { defaultValue: "Категорія" })} <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${fieldErrors.category_id ? "border-red-500" : "border-gray-300"}`}
              required
            >
              <option value="">{t(dict, "application.categoryPlaceholder", { defaultValue: "Оберіть категорію" })}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{getCategoryLabel(cat)}</option>
              ))}
            </select>
            {fieldErrors.category_id && <p className="mt-1 text-sm text-red-600">{fieldErrors.category_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.stoirNumber", { defaultValue: "Номер стора" })}
            </label>
            <input
              type="text"
              name="stoir_number"
              value={formData.stoir_number}
              onChange={handleChange}
              placeholder=""
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                fieldErrors.stoir_number ? "border-red-500" : "border-gray-300"
              }`}
            />
            {fieldErrors.stoir_number && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.stoir_number}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.photo", { defaultValue: "Фото" })}
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.proof", { defaultValue: "Документ підтвердження (PDF або зображення)" })} <span className="text-red-500">*</span>
            </label>
            <input
              ref={proofInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleProofChange}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${fieldErrors.proof ? "border-red-500" : "border-gray-300"}`}
              required
            />
            {proofFile && <p className="mt-1 text-sm text-gray-500">Обрано: {proofFile.name}</p>}
            {fieldErrors.proof && <p className="mt-1 text-sm text-red-600">{fieldErrors.proof}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.aboutShort", {
                defaultValue: "Коротко про себе",
              })}
            </label>
            <textarea
              name="about_short"
              value={formData.about_short}
              onChange={handleChange}
              rows={3}
              placeholder=""
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                fieldErrors.about_short ? "border-red-500" : "border-gray-300"
              }`}
            />
            {fieldErrors.about_short && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.about_short}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="terms_accepted"
                checked={formData.terms_accepted}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded mt-0.5"
              />
              <span className="text-sm font-semibold text-gray-700">
                {t(dict, "application.termsAccepted", {
                  defaultValue: "Я приймаю умови",
                })}{" "}
                <span className="text-red-500">*</span>
              </span>
            </label>
            <p className="mt-2 ml-8 text-sm text-gray-500">
              Бесплатное размещение X месяцев, далее 49,90 €/мес. Можно
              отказаться в любой момент.
            </p>
            {fieldErrors.terms_accepted && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.terms_accepted}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !formData.terms_accepted}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {t(dict, "application.submitting", {
                  defaultValue: "Відправка...",
                })}
              </>
            ) : (
              t(dict, "application.submit", {
                defaultValue: "Подати заявку",
              })
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
