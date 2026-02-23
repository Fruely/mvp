"use client";

import { useState } from "react";

type ClaimInitButtonProps = {
  token: string;
};

export default function ClaimInitButton({ token }: ClaimInitButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/specialist/claim-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });

      const json = (await response.json()) as
        | { action_link?: string; error?: string }
        | null;

      if (!response.ok || !json?.action_link) {
        setError(json?.error ?? "Не удалось продолжить вход.");
        return;
      }

      window.location.assign(json.action_link);
    } catch {
      setError("Ошибка сети. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-base font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Проверка..." : "Продолжить"}
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
