"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">
            Quick links to admin tools.
          </p>
        </div>

        {!hasToken && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
            Enter admin pages directly: /admin/leads or /admin/specialists
          </div>
        )}

        <div className="grid gap-3">
          <Link
            href="/admin/leads"
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
          >
            <span className="font-medium text-gray-900">Leads</span>
            <span className="text-sm text-gray-500">/admin/leads</span>
          </Link>

          <Link
            href="/admin/specialists"
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50"
          >
            <span className="font-medium text-gray-900">Specialists</span>
            <span className="text-sm text-gray-500">/admin/specialists</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

