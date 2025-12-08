"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";

export default function BecomeSpecialist() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    category_id: "",
    languages: [] as string[],
    hourly_rate: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categories = [
    { id: "psychologists", name: "Психолог" },
    { id: "masseurs", name: "Массажист" },
    { id: "tutors", name: "Репетитор" },
  ];

  const languages = [
    { code: "de", name: "Немецкий" },
    { code: "en", name: "Английский" },
    { code: "ru", name: "Русский" },
    { code: "uk", name: "Украинский" },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLanguageChange = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.includes(code)
        ? prev.languages.filter((l) => l !== code)
        : [...prev.languages, code],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name || !formData.email || !formData.category_id) {
        throw new Error("Заполните все обязательные поля");
      }

      if (formData.languages.length === 0) {
        throw new Error("Выберите хотя бы один язык");
      }

      const supabase = getSupabase();

      const { data, error: dbError } = await supabase
        .from("specialists")
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            bio: formData.bio || null,
            category_id: formData.category_id,
            languages: formData.languages,
            hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (dbError) throw dbError;

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        bio: "",
        category_id: "",
        languages: [],
        hourly_rate: "",
      });

      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block"
          >
            ← На главную
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Стать специалистом
          </h1>
          <p className="text-lg text-gray-600">
            Зарегистрируйтесь как специалист и найдите клиентов, которые нуждаются в вашей помощи
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg animate-fadeIn">
            ✓ Спасибо! Ваша заявка принята. Мы свяжемся с вами в ближайшее время.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded-lg animate-fadeIn">
            ✗ {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-8 space-y-6"
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ваше имя *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Иван Петров"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="ivan@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Телефон
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+49 123 456789"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Категория *
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              required
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Языки общения *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <label
                  key={lang.code}
                  className="flex items-center p-3 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.languages.includes(lang.code)}
                    onChange={() => handleLanguageChange(lang.code)}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-gray-700">{lang.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Почасовая ставка (€)
            </label>
            <input
              type="number"
              name="hourly_rate"
              value={formData.hourly_rate}
              onChange={handleChange}
              placeholder="25"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              О себе
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Расскажите о вашем опыте, квалификации и специализации..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Отправляем...
              </>
            ) : (
              "Зарегистрироваться"
            )}
          </button>

          <p className="text-center text-sm text-gray-600">
            * Обязательные поля
          </p>
        </form>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-2">Как это работает?</h3>
          <ul className="text-gray-700 space-y-2 text-sm">
            <li>✓ Заполните форму со своей информацией</li>
            <li>✓ Мы проверим ваши данные</li>
            <li>✓ Вы появитесь в каталоге специалистов</li>
            <li>✓ Клиенты смогут найти вас и запросить услуги</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
