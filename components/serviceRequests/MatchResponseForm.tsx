"use client";

import { useState } from "react";

type ResponseStatus = "active" | "interested" | "declined" | "expired";

export default function MatchResponseForm({
  matchId,
  status,
  labels,
}: {
  matchId: string;
  status: ResponseStatus;
  labels: {
    interested: string;
    declined: string;
    interestedDone: string;
    declinedDone: string;
    expired: string;
    error: string;
  };
}) {
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState<"interested" | "declined" | null>(null);
  const [failed, setFailed] = useState(false);

  async function send(response: "interested" | "declined") {
    setPending(response);
    setFailed(false);
    try {
      const res = await fetch(`/api/specialist/matches/${matchId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      const body = (await res.json()) as { status?: ResponseStatus };
      if (body.status === "interested" || body.status === "declined" || body.status === "expired" || body.status === "active") {
        setCurrent(body.status);
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(null);
    }
  }

  if (current === "interested") {
    return <p className="text-sm font-medium text-emerald-800">{labels.interestedDone}</p>;
  }
  if (current === "declined") {
    return <p className="text-sm font-medium text-gray-700">{labels.declinedDone}</p>;
  }
  if (current === "expired") {
    return <p className="text-sm font-medium text-gray-700">{labels.expired}</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => send("interested")}
        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {labels.interested}
      </button>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => send("declined")}
        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-60"
      >
        {labels.declined}
      </button>
      {failed ? <p className="w-full text-sm text-red-700">{labels.error}</p> : null}
    </div>
  );
}
