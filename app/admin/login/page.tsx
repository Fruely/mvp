"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trimmed = token.trim();
      if (!trimmed) {
        setError("Введите токен");
        setLoading(false);
        return;
      }

      // Сохраняем токен админ API в localStorage
      localStorage.setItem("ADMIN_API_TOKEN", trimmed);
      localStorage.setItem("admin_login_time", String(Date.now()));

      // Редирект на админ-панель
      router.push("/admin/site-blocks");
    } catch (e: any) {
      setError(e.message || "Ошибка входа");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">FREULY Admin</h1>
          <p className="text-gray-600 mt-2">Управление визуальным контентом</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin API token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Введите токен"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Проверка..." : "Войти"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="font-semibold mb-2">Доступные функции:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Управление hero-изображением</li>
            <li>Загрузка и редактирование мозаики</li>
            <li>Контроль визуального контента сайта</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
