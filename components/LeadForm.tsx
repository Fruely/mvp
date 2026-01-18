"use client";

import { useState } from "react";

interface LeadFormProps {
  specialistId?: string;
}

export default function LeadForm({ specialistId }: LeadFormProps) {
  const [client_name, setName] = useState("");
  const [client_contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    // Validate specialistId
    if (!specialistId) {
      console.error("[LeadForm] ERROR: specialistId not provided");
      setStatus("error:Ошибка: не удалось определить специалиста");
      setLoading(false);
      return;
    }

    const payload = {
      specialist_id: specialistId,
      client_name,
      client_contact,
      message: message || null,
    };

    console.log("[LeadForm] Sending payload:", payload);

    const res = await fetch("/api/leads/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log("[LeadForm] API response:", { status: res.status, ok: res.ok, data });

    if (!res.ok) {
      setStatus("error:" + (data.error || "Не удалось отправить"));
      console.error("[LeadForm] API error:", data.error);
    } else {
      setStatus("success:Заявка отправлена!");
      console.log("[LeadForm] Lead created successfully:", data.data?.id);
      setName("");
      setContact("");
      setMessage("");
    }

    setLoading(false);
  };

  const isSuccess = status.startsWith("success:");
  const isError = status.startsWith("error:");
  const statusMessage = status.split(":")[1] || "";

  return (
    <div className="w-full max-w-md mx-auto mt-8 px-4 animate-fadeIn">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ваше имя
          </label>
          <input
            type="text"
            placeholder="Иван Петров"
            value={client_name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full py-2 px-4 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Контакт <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="email@example.com или +7 (999) 123-45-67"
            value={client_contact}
            onChange={(e) => setContact(e.target.value)}
            required
            className="w-full py-2 px-4 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Сообщение
          </label>
          <textarea
            placeholder="Опишите ваш вопрос или проблему..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full py-2 px-4 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              Отправка...
            </>
          ) : (
            "Отправить заявку"
          )}
        </button>

        {isSuccess && (
          <div className="bg-green-50 text-green-700 border border-green-200 rounded-xl p-3 mt-3 shadow-sm">
            • {statusMessage}
          </div>
        )}

        {isError && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-3 mt-3 shadow-sm">
            ✗ {statusMessage}
          </div>
        )}
      </form>
    </div>
  );
}
