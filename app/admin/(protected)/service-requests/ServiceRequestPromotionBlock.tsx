"use client";

import { useEffect, useState, useTransition } from "react";
import { PROMOTION_LOCALES } from "@/lib/serviceRequests/promotionConstants";
import type { ServiceRequestPromotionAdmin } from "@/lib/serviceRequests/promotionAdminData";
import {
  closePromotionAction,
  publishPromotionAction,
  savePromotionDraftAction,
} from "./promotionActions";

type Props = {
  serviceRequestId: string;
  initialPromotion: ServiceRequestPromotionAdmin | null;
  defaultLocale: string;
};

type FormState = {
  locale: string;
  public_title: string;
  public_summary: string;
};

export default function ServiceRequestPromotionBlock({
  serviceRequestId,
  initialPromotion,
  defaultLocale,
}: Props) {
  const [promotion, setPromotion] = useState<ServiceRequestPromotionAdmin | null>(initialPromotion);
  const [form, setForm] = useState<FormState>(() => ({
    locale: initialPromotion?.locale ?? defaultLocale,
    public_title: initialPromotion?.public_title ?? "",
    public_summary: initialPromotion?.public_summary ?? "",
  }));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPromotion(initialPromotion);
    setForm({
      locale: initialPromotion?.locale ?? defaultLocale,
      public_title: initialPromotion?.public_title ?? "",
      public_summary: initialPromotion?.public_summary ?? "",
    });
  }, [initialPromotion, defaultLocale, serviceRequestId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function runAction(action: () => Promise<{ ok: boolean; promotion?: ServiceRequestPromotionAdmin; error?: string }>) {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await action();
      if (!result.ok || !result.promotion) {
        setError("Не удалось выполнить действие.");
        return;
      }
      setPromotion(result.promotion);
      setForm({
        locale: result.promotion.locale,
        public_title: result.promotion.public_title,
        public_summary: result.promotion.public_summary,
      });
    });
  }

  async function handleCopyLink() {
    if (!promotion?.public_url) return;
    try {
      await navigator.clipboard.writeText(promotion.public_url);
      setCopied(true);
    } catch {
      setError("Не удалось скопировать ссылку.");
    }
  }

  const isClosed = promotion?.status === "closed";
  const isPublished = promotion?.status === "published";

  return (
    <section className="mt-6 border-t pt-4 space-y-3">
      <h3 className="font-semibold text-base">Публичная публикация</h3>
      <p className="text-xs text-gray-500">
        Заполните обезличенный текст вручную. Исходное описание клиента не копируется автоматически.
      </p>

      {promotion ? (
        <p className="text-xs text-gray-600">
          Статус:{" "}
          <span className="font-medium">
            {promotion.status === "draft"
              ? "Черновик"
              : promotion.status === "published"
                ? "Опубликовано"
                : "Закрыто"}
          </span>
        </p>
      ) : null}

      <label className="block">
        <span className="font-medium">Язык публикации</span>
        <select
          className="mt-1 block w-full border rounded px-2 py-1"
          value={form.locale}
          disabled={isPending || isClosed}
          onChange={(e) => updateField("locale", e.target.value)}
        >
          {PROMOTION_LOCALES.map((locale) => (
            <option key={locale} value={locale}>
              {locale}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="font-medium">Публичный заголовок</span>
        <input
          type="text"
          className="mt-1 block w-full border rounded px-2 py-1"
          value={form.public_title}
          disabled={isPending || isClosed}
          onChange={(e) => updateField("public_title", e.target.value)}
        />
      </label>

      <label className="block">
        <span className="font-medium">Публичное описание</span>
        <textarea
          className="mt-1 block w-full border rounded px-2 py-1 min-h-[120px]"
          value={form.public_summary}
          disabled={isPending || isClosed}
          onChange={(e) => updateField("public_summary", e.target.value)}
        />
      </label>

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        {!promotion ? (
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white disabled:opacity-50"
            disabled={isPending}
            onClick={() =>
              runAction(() => savePromotionDraftAction(serviceRequestId, form))
            }
          >
            Создать черновик
          </button>
        ) : null}

        {promotion && !isClosed ? (
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
            disabled={isPending}
            onClick={() =>
              runAction(() => savePromotionDraftAction(serviceRequestId, form))
            }
          >
            {isPublished ? "Сохранить" : "Сохранить черновик"}
          </button>
        ) : null}

        {promotion && promotion.status === "draft" ? (
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded bg-blue-700 text-white disabled:opacity-50"
            disabled={isPending}
            onClick={() => runAction(() => publishPromotionAction(serviceRequestId))}
          >
            Опубликовать
          </button>
        ) : null}

        {promotion && !isClosed ? (
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded border border-red-300 text-red-700 disabled:opacity-50"
            disabled={isPending}
            onClick={() => runAction(() => closePromotionAction(serviceRequestId))}
          >
            Закрыть публикацию
          </button>
        ) : null}

        {promotion && isPublished ? (
          <>
            {promotion.public_url ? (
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
                disabled={isPending}
                onClick={handleCopyLink}
              >
                {copied ? "Ссылка скопирована" : "Скопировать публичную ссылку"}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {isPublished && promotion?.public_url ? (
        <p className="text-xs text-gray-600 break-all">
          <strong>Публичная ссылка:</strong> {promotion.public_url}
        </p>
      ) : null}
    </section>
  );
}
