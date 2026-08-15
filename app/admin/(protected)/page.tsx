"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/adminCopy";

const TOKEN_STORAGE_KEY = "ADMIN_API_TOKEN";

export default function AdminDashboardPage() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      setHasToken(!!token && token.trim().length > 0);
    } catch {
      setHasToken(false);
    }
  }, []);

  const quickLinks = ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin" && item.href !== "/admin/help");

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Обзор</h1>
          <p className="text-sm text-gray-600">Быстрые ссылки на разделы админки Freuly.</p>
        </div>

        {!hasToken && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
            Для API-запросов некоторых страниц может потребоваться токен в localStorage. Основной
            доступ защищён cookie после входа.
          </div>
        )}

        <div className="mb-6 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm font-medium text-indigo-900">Новичку в админке?</p>
          <p className="mt-1 text-sm text-indigo-800">
            Начните с{" "}
            <Link href="/admin/help" className="font-semibold underline">
              инструкции по партнёрской программе
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">{item.label}</span>
              <span className="text-sm text-gray-500">{item.href}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
