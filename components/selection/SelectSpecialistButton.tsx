"use client";

import { useState } from "react";

export default function SelectSpecialistButton({
  publicId,
  specialistId,
  label,
  errorLabel,
}: {
  publicId: string;
  specialistId: string;
  label: string;
  errorLabel: string;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function choose() {
    setPending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/client/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, specialistId }),
      });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      window.location.reload();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={choose}
        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {label}
      </button>
      {failed ? <p className="mt-2 text-sm text-red-700">{errorLabel}</p> : null}
    </div>
  );
}
