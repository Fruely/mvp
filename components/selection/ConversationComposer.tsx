"use client";

import { useState, type FormEvent } from "react";

export default function ConversationComposer({
  conversationId,
  placeholder,
  sendLabel,
  errorLabel,
}: {
  conversationId: string;
  placeholder: string;
  sendLabel: string;
  errorLabel: string;
}) {
  const [body, setBody] = useState("");
  const [failed, setFailed] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    setFailed(false);
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      setFailed(true);
      return;
    }
    setBody("");
    window.location.reload();
  }

  return (
    <form onSubmit={send} className="mt-6 space-y-3">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={2000}
        placeholder={placeholder}
        className="min-h-24 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
      />
      <button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
        {sendLabel}
      </button>
      {failed ? <p className="text-sm text-red-700">{errorLabel}</p> : null}
    </form>
  );
}
