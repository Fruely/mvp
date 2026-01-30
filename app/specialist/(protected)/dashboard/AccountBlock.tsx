"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";

type AccountBlockProps = {
  email: string;
  initialPhone: string;
};

export default function AccountBlock({
  email,
  initialPhone,
}: AccountBlockProps) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [isSaving, startSaving] = useTransition();
  const [isPausing, startPausing] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    startSaving(async () => {
      try {
        const res = await fetch("/api/specialist/account", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone: phone || null }),
        });

        if (!res.ok) {
          let message = "Не удалось обновить данные. Попробуйте ещё раз.";
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

        setSuccessMessage("Данные аккаунта обновлены.");
      } catch {
        setErrorMessage("Не удалось обновить данные. Попробуйте ещё раз.");
      }
    });
  };

  const handlePause = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startPausing(async () => {
      try {
        const res = await fetch("/api/specialist/account/pause", {
          method: "POST",
        });

        if (!res.ok) {
          let message = "Не удалось поставить профиль на паузу.";
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

        router.push("/specialist/dashboard");
      } catch {
        setErrorMessage("Не удалось поставить профиль на паузу.");
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
          />
          <p className="text-xs text-gray-400">
            Email используется для входа и уведомлений.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Телефон
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            placeholder="+49 ..."
          />
          <p className="text-xs text-gray-400">
            Номер телефона виден только клиентам, которые оставили вам запрос.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </button>

          <button
            type="button"
            onClick={handlePause}
            disabled={isPausing}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPausing ? "Обработка..." : "Поставить профиль на паузу"}
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
