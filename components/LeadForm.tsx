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

    const res = await fetch("/api/leads/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        specialist_id: specialistId || "bff0ae01-0bc9-4f9d-bab2-292460455794",
        client_name,
        client_contact,
        message,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("❌ Ошибка: " + (data.error || "Не удалось отправить"));
    } else {
      setStatus("✅ Заявка отправлена!");
      setName("");
      setContact("");
      setMessage("");
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "10px" }}
    >
      <input
        placeholder="Ваше имя"
        value={client_name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        placeholder="Контакт (email или телефон)"
        value={client_contact}
        onChange={(e) => setContact(e.target.value)}
        required
      />
      <textarea
        placeholder="Сообщение"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button type="submit" disabled={loading}>
        {loading ? "Отправка..." : "Отправить заявку"}
      </button>

      {status && <p>{status}</p>}
    </form>
  );
}
