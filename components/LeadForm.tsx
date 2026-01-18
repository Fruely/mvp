"use client";

import { useState } from "react";

interface LeadFormProps {
  specialistId?: string;
}

export default function LeadForm({ specialistId }: LeadFormProps) {
  const [client_name, setName] = useState("");
  const [client_email, setEmail] = useState("");
  const [client_phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    if (!specialistId) {
      setStatus("error:Не удалось определить специалиста");
      setLoading(false);
      return;
    }

    if (!client_email && !client_phone) {
      setStatus("error:Укажите email или телефон");
      setLoading(false);
      return;
    }

    const payload = {
      specialist_id: specialistId,
      client_name: client_name || null,
      client_email: client_email || null,
      client_phone: client_phone || null,
      message: message || null,
    };

    console.log("[LeadForm] Sending payload:", payload);

    const res = await fetch("/api/leads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error:" + (data.error || "Ошибка отправки"));
    } else {
      setStatus("success:Заявка отправлена!");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    }

    setLoading(false);
  };

  const isSuccess = status.startsWith("success:");
  const isError = status.startsWith("error:");
  const statusMessage = status.split(":")[1] || "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        placeholder="Ваше имя"
        value={client_name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        type="email"
        placeholder="Email"
        value={client_email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="tel"
        placeholder="Телефон"
        value={client_phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <textarea
        placeholder="Сообщение"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button disabled={loading} type="submit">
        {loading ? "Отправка..." : "Отправить заявку"}
      </button>

      {isSuccess && <div className="text-green-600">{statusMessage}</div>}
      {isError && <div className="text-red-600">{statusMessage}</div>}
    </form>
  );
}
