"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import uaDict from "@/locales/ua.json";
import InstallFreuly from "@/components/pwa/InstallFreuly";

interface LeadFormProps {
  specialistId?: string;
  onSuccess?: (message: string) => void;
}

export default function LeadForm({ specialistId, onSuccess }: LeadFormProps) {
  const pathname = usePathname() || "/";
  const lang = useMemo<Lang>(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg === "ua" || seg === "ru" || seg === "de" ? (seg as Lang) : "ua";
  }, [pathname]);

  const [dict, setDict] = useState<Dictionary>(uaDict as unknown as Dictionary);

  useEffect(() => {
    let cancelled = false;
    getDictionary(lang)
      .then((d) => {
        if (!cancelled) setDict(d);
      })
      .catch(() => {
        if (!cancelled) setDict(uaDict as unknown as Dictionary);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const [client_name, setName] = useState("");
  const [client_email, setEmail] = useState("");
  const [client_phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [hp, setHp] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    if (!specialistId) {
      setStatus(`error:${t(dict, "lead.noSpecialist")}`);
      setLoading(false);
      return;
    }

    if (!client_name.trim()) {
      setStatus(`error:${t(dict, "lead.nameRequired")}`);
      setLoading(false);
      return;
    }

    if (!client_email.trim()) {
      setStatus(`error:${t(dict, "lead.emailRequired")}`);
      setLoading(false);
      return;
    }

    if (!client_phone.trim()) {
      setStatus(`error:${t(dict, "lead.phoneRequired")}`);
      setLoading(false);
      return;
    }

    const payload = {
      specialist_id: specialistId,
      client_name: client_name || null,
      client_email: client_email || null,
      client_phone: client_phone || null,
      message: message || null,
      source: "specialist_profile",
      source_path: pathname,
      referrer:
        typeof document !== "undefined" ? document.referrer || null : null,
      hp,
    };

    try {
      const res = await fetch("/api/leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error:" + (data.error || t(dict, "lead.error")));
      } else {
        const successMessage = t(dict, "lead.success");
        setStatus(`success:${successMessage}`);
        onSuccess?.(successMessage);
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
      }
    } catch {
      setStatus(`error:${t(dict, "lead.error")}`);
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = status.startsWith("success:");
  const isError = status.startsWith("error:");
  const statusMessage = status.split(":")[1] || "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        placeholder={t(dict, "lead.name")}
        value={client_name}
        onChange={(e) => setName(e.target.value)}
        required
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />

      <input
        type="email"
        placeholder={t(dict, "lead.email")}
        value={client_email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />
      <p className="-mt-1 text-xs text-gray-400">{t(dict, "lead.emailHint")}</p>

      <input
        type="tel"
        placeholder={t(dict, "lead.phone")}
        value={client_phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />
      <p className="-mt-1 text-xs text-gray-400">{t(dict, "lead.phoneHint")}</p>

      <textarea
        placeholder={t(dict, "lead.message")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
      />

      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      <button
        disabled={loading}
        type="submit"
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? t(dict, "lead.sending") : t(dict, "lead.submit")}
      </button>

      {isSuccess && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{statusMessage}</div>}
      {isSuccess ? (
        <InstallFreuly
          lang={lang}
          audience="client"
          placement="lead_success"
          variant="compact"
          className="mt-1"
        />
      ) : null}
      {isError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{statusMessage}</div>}
    </form>
  );
}
