"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";

type Category = {
  slug: string;
  title: string;
};

type SpecialistApplicationFormProps = {
  lang: string;
  dict: Dictionary;
};

type FormData = {
  name: string;
  email: string;
  category_slug: string;
  city: string;
  postal_code: string;
  proof_link: string;
  phone: string;
  languages: string[];
};

const SUPPORTED_LANGUAGES = [
  { code: "ua", label: "Українська" },
  { code: "ru", label: "Русский" },
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
];

export default function SpecialistApplicationForm({
  lang,
  dict,
}: SpecialistApplicationFormProps) {
  const pathname = usePathname() || "/";
  const langPrefix = useMemo(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg === "ua" || seg === "ru" || seg === "de" ? `/${seg}` : "/ua";
  }, [pathname]);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    category_slug: "",
    city: "",
    postal_code: "",
    proof_link: "",
    phone: "",
    languages: [],
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    // Load categories
    fetch("/api/filters")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
        }
        setLoadingCategories(false);
      })
      .catch((err) => {
        console.error("Failed to load categories:", err);
        setLoadingCategories(false);
      });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name as keyof FormData]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof FormData];
        return newErrors;
      });
    }
  };

  const handleLanguageToggle = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(code)
        ? prev.languages.filter((l) => l !== code)
        : [...prev.languages, code],
    }));
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = t(dict, "application.errors.nameRequired", {
        defaultValue: "Ім'я обов'язкове",
      });
    }

    if (!formData.email.trim()) {
      errors.email = t(dict, "application.errors.emailRequired", {
        defaultValue: "Email обов'язковий",
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t(dict, "application.errors.emailInvalid", {
        defaultValue: "Невірний формат email",
      });
    }

    if (!formData.category_slug) {
      errors.category_slug = t(dict, "application.errors.categoryRequired", {
        defaultValue: "Категорія обов'язкова",
      });
    }

    if (!formData.city.trim() && !formData.postal_code.trim()) {
      errors.city = t(dict, "application.errors.locationRequired", {
        defaultValue: "Вкажіть місто або поштовий індекс",
      });
    }

    if (!formData.proof_link.trim()) {
      errors.proof_link = t(dict, "application.errors.proofLinkRequired", {
        defaultValue: "Посилання обов'язкове",
      });
    } else if (!/^https?:\/\/.+/.test(formData.proof_link)) {
      errors.proof_link = t(dict, "application.errors.proofLinkInvalid", {
        defaultValue: "Невірний формат посилання",
      });
    }

    if (formData.languages.length === 0) {
      errors.languages = t(dict, "application.errors.languagesRequired", {
        defaultValue: "Виберіть хоча б одну мову",
      });
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        category_slug: formData.category_slug,
        city: formData.city.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        proof_link: formData.proof_link.trim(),
        phone: formData.phone.trim() || null,
        languages: formData.languages,
      };

      // Ensure at least one location field is provided
      if (!payload.city && !payload.postal_code) {
        throw new Error(
          t(dict, "application.errors.locationRequired", {
            defaultValue: "Вкажіть місто або поштовий індекс",
          })
        );
      }

      const response = await fetch("/api/specialists/application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            t(dict, "application.errors.submitFailed", {
              defaultValue: "Помилка при відправці заявки",
            })
        );
      }

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        category_slug: "",
        city: "",
        postal_code: "",
        proof_link: "",
        phone: "",
        languages: [],
      });
      setFieldErrors({});
    } catch (err: any) {
      setError(
        err.message ||
          t(dict, "application.errors.submitFailed", {
            defaultValue: "Помилка при відправці заявки",
          })
      );
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
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.name", {
                defaultValue: "Імʼя та прізвище",
              })}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t(dict, "application.namePlaceholder", {
                defaultValue: "Іван Петров",
              })}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                fieldErrors.name ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            {fieldErrors.name && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email */}
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

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.category", {
                defaultValue: "Категорія послуг",
              })}{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              name="category_slug"
              value={formData.category_slug}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                fieldErrors.category_slug
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              required
              disabled={loadingCategories}
            >
              <option value="">
                {loadingCategories
                  ? t(dict, "application.loading", { defaultValue: "Завантаження..." })
                  : t(dict, "application.categoryPlaceholder", {
                      defaultValue: "Виберіть категорію",
                    })}
              </option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.title}
                </option>
              ))}
            </select>
            {fieldErrors.category_slug && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.category_slug}
              </p>
            )}
          </div>

          {/* City or Postal Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t(dict, "application.city", {
                  defaultValue: "Місто / регіон",
                })}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder={t(dict, "application.cityPlaceholder", {
                  defaultValue: "Берлін",
                })}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                  fieldErrors.city ? "border-red-500" : "border-gray-300"
                }`}
              />
              {fieldErrors.city && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.city}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t(dict, "application.postalCode", {
                  defaultValue: "Поштовий індекс (PLZ)",
                })}
              </label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder={t(dict, "application.postalCodePlaceholder", {
                  defaultValue: "10115",
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t(dict, "application.locationHint", {
                  defaultValue: "Вкажіть місто або поштовий індекс",
                })}
              </p>
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.languages", {
                defaultValue: "Мови обслуговування",
              })}{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SUPPORTED_LANGUAGES.map((langItem) => (
                <label
                  key={langItem.code}
                  className={`flex items-center p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition ${
                    formData.languages.includes(langItem.code)
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.languages.includes(langItem.code)}
                    onChange={() => handleLanguageToggle(langItem.code)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-gray-700 text-sm">
                    {langItem.label}
                  </span>
                </label>
              ))}
            </div>
            {fieldErrors.languages && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.languages}
              </p>
            )}
          </div>

          {/* Proof Link */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.proofLink", {
                defaultValue:
                  "Посилання, яке підтверджує, що ви реально працюючий спеціаліст",
              })}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              name="proof_link"
              value={formData.proof_link}
              onChange={handleChange}
              placeholder={t(dict, "application.proofLinkPlaceholder", {
                defaultValue: "https://example.com",
              })}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                fieldErrors.proof_link ? "border-red-500" : "border-gray-300"
              }`}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              {t(dict, "application.proofLinkHint", {
                defaultValue:
                  "Сайт, соцмережа, Google Business, LinkedIn тощо. Без посилання заявку не розглядаємо.",
              })}
            </p>
            {fieldErrors.proof_link && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.proof_link}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t(dict, "application.phone", { defaultValue: "Телефон" })}
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t(dict, "application.phonePlaceholder", {
                defaultValue: "+49 123 456789",
              })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || loadingCategories}
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
