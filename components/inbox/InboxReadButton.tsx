"use client";

import { useState } from "react";

export default function InboxReadButton({ inboxId, label }: { inboxId: string; label: string }) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  async function mark() {
    setFailed(false);
    try {
      const res = await fetch(`/api/specialist/inbox/${inboxId}/read`, { method: "POST" });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      setDone(true);
    } catch {
      setFailed(true);
    }
  }

  if (done) return null;
  return (
    <button type="button" onClick={mark} className="text-sm font-medium text-emerald-800">
      {failed ? label : label}
    </button>
  );
}
