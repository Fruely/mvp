"use client";

import { useState } from "react";

const marketingLinks = [
  {
    lang: "RU",
    searchLabel: "Поиск через Freuly",
    searchUrl: "https://freuly.de/ru/find",
    requestLabel: "Прямая заявка",
    requestUrl: "https://freuly.de/ru/request",
  },
  {
    lang: "UA",
    searchLabel: "Пошук через Freuly",
    searchUrl: "https://freuly.de/ua/find",
    requestLabel: "Пряма заявка",
    requestUrl: "https://freuly.de/ua/request",
  },
  {
    lang: "DE",
    searchLabel: "Suche über Freuly",
    searchUrl: "https://freuly.de/de/find",
    requestLabel: "Direkte Anfrage",
    requestUrl: "https://freuly.de/de/request",
  },
] as const;

export default function MarketingLinksPage() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copyUrl(url: string) {
    setError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => {
        setCopiedUrl((current) => (current === url ? null : current));
      }, 1800);
    } catch {
      setError("Не удалось скопировать ссылку.");
    }
  }

  function LinkRow({ label, url }: { label: string; url: string }) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-500">
            {url.endsWith("/find") ? "Search" : "Request"}
          </span>
        </div>
        <p className="break-all rounded-md bg-white px-3 py-2 font-mono text-sm text-gray-700 ring-1 ring-gray-200">
          {url}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyUrl(url)}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            {copiedUrl === url ? "Скопировано" : "Копировать"}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Открыть
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Marketing links</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Готовые ссылки для Telegram, Threads, Facebook, рекламы и прямых ответов клиентам.
            Search ведёт сразу в первый шаг поиска «Какая услуга вам нужна?», Request — сразу в форму заявки Freuly.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {marketingLinks.map((group) => (
            <section key={group.lang} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{group.lang}</h2>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  freuly.de
                </span>
              </div>
              <div className="space-y-4">
                <LinkRow label={group.searchLabel} url={group.searchUrl} />
                <LinkRow label={group.requestLabel} url={group.requestUrl} />
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <strong>Когда использовать:</strong> для общего внешнего трафика — <code>/find</code>. Если уже известно, что нужно сразу собрать заявку без поиска — <code>/request</code>.
        </div>
      </div>
    </div>
  );
}
