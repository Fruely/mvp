"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (fileName: string): Promise<string | null> => {
    if (!avatarFile) return null;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true });

      if (error) {
        console.error("Avatar upload error:", error);
        // Don't block registration if avatar upload fails
        return null;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error("Avatar upload exception:", err);
      // Don't block registration if avatar upload fails
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("HANDLE SUBMIT CALLED");
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

      // Upload avatar if provided
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const timestamp = Date.now();
        const fileName = `${formData.email}-${timestamp}`;
        avatarUrl = await uploadAvatar(fileName);
      }

      // Call API endpoint to create specialist
      console.log("ABOUT TO CALL API");
      const response = await fetch("/api/specialists/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          bio: formData.bio || null,
          category_id: formData.category_id,
          languages: formData.languages,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          avatar_url: avatarUrl,
        }),
      });

      const result = await response.json();

      console.log("API RESPONSE", result);

      if (!response.ok) {
        throw new Error(result.error || "Ошибка при регистрации");
      }

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
      setAvatarFile(null);
      setAvatarPreview(null);

      setTimeout(() => {
        setSuccess(false);
      }, 15000);
    } catch (err: any) {
      setError(err.message || "Ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
            ← На главную
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Стать специалистом
          </h1>
          <p className="text-lg text-gray-600">
            Зарегистрируйтесь как специалист и найдите клиентов
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg">
            ✓ Спасибо! Ваша заявка отправлена на модерацию.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded-lg">
            ✗ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Фото профиля
            </label>
            <div className="flex gap-4 items-start">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Preview"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </div>
              <label className="flex-1 flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 transition">
                <span className="text-center">
                  <span className="text-xl block mb-1">📸</span>
                  <span className="text-sm text-gray-600">Загрузить фото</span>
                </span>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ваше имя *</label>
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Телефон</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+49 123 456789"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Категория *</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              required
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Языки общения *</label>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <label key={lang.code} className="flex items-center p-3 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Почасовая ставка (€)</label>
            <input
              type="number"
              name="hourly_rate"
              value={formData.hourly_rate}
              onChange={handleChange}
              placeholder="25"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">О себе</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Расскажите о вашем опыте..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Отправляем...
              </>
            ) : (
              "✉️ Отправить на модерацию"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
