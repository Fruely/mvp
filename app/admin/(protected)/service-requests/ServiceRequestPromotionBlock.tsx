"use client";

import { useEffect, useState, useTransition } from "react";
import { PROMOTION_LOCALES, type PromotionLocale } from "@/lib/serviceRequests/promotionConstants";
import type { ServiceRequestPromotionAdmin } from "@/lib/serviceRequests/promotionAdminData";
import { isPromotionLocale } from "@/lib/serviceRequests/localizedPublicCopy";
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

type LocaleCopyForm = Record<PromotionLocale, { title: string; summary: string }>;

const LOCALE_LABELS: Record<PromotionLocale, string> = {
  ru: "Русский (RU)",
  ua: "Українська (UA)",
  de: "Deutsch (DE)",
};

function sourceLocaleFrom(value: string | null | undefined): PromotionLocale {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "uk" || normalized === "ua") return "ua";
  if (isPromotionLocale(normalized)) return normalized;
  return "ru";
}

function emptyCopies(): LocaleCopyForm {
  return {
    ru: { title: "", summary: "" },
    ua: { title: "", summary: "" },
    de: { title: "", summary: "" },
  };
}

function copiesFromPromotion(
  promotion: ServiceRequestPromotionAdmin | null,
  sourceLocale: PromotionLocale,
): LocaleCopyForm {
  const copies = emptyCopies();
  for (const locale of PROMOTION_LOCALES) {
    copies[locale] = {
      title: promotion?.localized_copy?.[locale]?.title ?? "",
      summary: promotion?.localized_copy?.[locale]?.summary ?? "",
    };
  }
  if (!copies[sourceLocale].title && promotion?.public_title) {
    copies[sourceLocale].title = promotion.public_title;
  }
  if (!copies[sourceLocale].summary && promotion?.public_summary) {
    copies[sourceLocale].summary = promotion.public_summary;
  }
  return copies;
}

export default function ServiceRequestPromotionBlock({
  serviceRequestId,
  initialPromotion,
  defaultLocale,
}: Props) {
  const [promotion, setPromotion] = useState<ServiceRequestPromotionAdmin | null>(initialPromotion);
  const [sourceLocale, setSourceLocale] = useState<PromotionLocale>(
    sourceLocaleFrom(initialPromotion?.locale ?? defaultLocale),
  );
  const [copies, setCopies] = useState<LocaleCopyForm>(() =>
    copiesFromPromotion(initialPromotion, sourceLocaleFrom(initialPromotion?.locale ?? defaultLocale)),
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedAccept, setCopiedAccept] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const nextSource = sourceLocaleFrom(initialPromotion?.locale ?? defaultLocale);
    setPromotion(initialPromotion);
    setSourceLocale(nextSource);
    setCopies(copiesFromPromotion(initialPromotion, nextSource));
  }, [initialPromotion, defaultLocale, serviceRequestId]);

  function updateCopy(locale: PromotionLocale, field: "title" | "summary", value: string) {
    setCopies((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }));
  }

  function draftPayload() {
    return {
      locale: sourceLocale,
      public_title: copies[sourceLocale].title,
      public_summary: copies[sourceLocale].summary,
      copies,
    };
  }

  function applyPromotion(next: ServiceRequestPromotionAdmin) {
    setPromotion(next);
    const nextSource = sourceLocaleFrom(next.locale);
    setSourceLocale(nextSource);
    setCopies(copiesFromPromotion(next, nextSource));
  }

  function runAction(action: () => Promise<{ ok: boolean; promotion?: ServiceRequestPromotionAdmin; error?: string }>) {
    setError(null);
    setCopied(false);
    setCopiedAccept(false);
    startTransition(async () => {
      const result = await action();
      if (!result.ok || !result.promotion) {
        setError("Не удалось выполнить действие.");
        return;
      }
      applyPromotion(result.promotion);
    });
  }

  async function handleCopyAcceptLink() {
    if (!promotion?.accept_url) return;
    try {
      await navigator.clipboard.writeText(promotion.accept_url);
      setCopiedAccept(true);
    } catch {
      setError("Не удалось скопировать ссылку.");
    }
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
  const statusLabel =
    promotion?.status === "draft"
      ? "Черновик"
      : promotion?.status === "published"
        ? "Опубликовано во всех языковых версиях"
        : promotion?.status === "closed"
          ? "Закрыто"
          : "Нет публикации";

  return (
    <section className="mt-6 border-t pt-4 space-y-3">
      <h3 className="font-semibold text-base">Публичная публикация</h3>
      <p className="text-xs text-gray-500">
        Заполните обезличенный текст вручную. Исходное описание клиента не копируется автоматически.
        Язык заявки — предпочтение клиента для подбора специалиста, а не ограничение видимости карточки.
      </p>

      <p className="text-xs text-gray-600">
        Исходный язык заявки:{" "}
        <span className="font-medium">{LOCALE_LABELS[sourceLocale]}</span>
      </p>

      <p className="text-xs text-gray-600">
        Статус: <span className="font-medium">{statusLabel}</span>
      </p>

      {PROMOTION_LOCALES.map((locale) => (
        <fieldset key={locale} className="space-y-2 rounded border border-gray-200 p-3">
          <legend className="px-1 text-sm font-medium">
            Публичный текст {LOCALE_LABELS[locale]}
            {locale === sourceLocale ? " — оригинал" : " — перевод"}
          </legend>
          <label className="block">
            <span className="font-medium">Публичный заголовок</span>
            <input
              type="text"
              className="mt-1 block w-full border rounded px-2 py-1"
              value={copies[locale].title}
              disabled={isPending || isClosed}
              onChange={(e) => updateCopy(locale, "title", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="font-medium">Публичное описание</span>
            <textarea
              className="mt-1 block w-full border rounded px-2 py-1 min-h-[96px]"
              value={copies[locale].summary}
              disabled={isPending || isClosed}
              onChange={(e) => updateCopy(locale, "summary", e.target.value)}
            />
          </label>
        </fieldset>
      ))}

      {error ? <p className="text-red-600 text-sm">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        {!promotion ? (
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white disabled:opacity-50"
            disabled={isPending}
            onClick={() =>
              runAction(() => savePromotionDraftAction(serviceRequestId, draftPayload()))
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
              runAction(() => savePromotionDraftAction(serviceRequestId, draftPayload()))
            }
          >
            Сохранить
          </button>
        ) : null}

        {promotion && !isClosed ? (
          <button
            type="button"
            className="px-3 py-1.5 text-sm rounded bg-blue-700 text-white disabled:opacity-50"
            disabled={isPending}
            onClick={() =>
              runAction(async () => {
                const saved = await savePromotionDraftAction(serviceRequestId, draftPayload());
                if (!saved.ok) return saved;
                return publishPromotionAction(serviceRequestId);
              })
            }
          >
            Опубликовать во всех языковых версиях
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
            {promotion.accept_url ? (
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-emerald-300 text-emerald-800 disabled:opacity-50"
                disabled={isPending}
                onClick={handleCopyAcceptLink}
              >
                {copiedAccept ? "Ссылка «Принять» скопирована" : "Скопировать ссылку «Принять заявку»"}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {isPublished && promotion?.public_urls ? (
        <div className="text-xs text-gray-600 break-all space-y-1">
          <p>
            <strong>RU:</strong> {promotion.public_urls.ru}
          </p>
          <p>
            <strong>UA:</strong> {promotion.public_urls.ua}
          </p>
          <p>
            <strong>DE:</strong> {promotion.public_urls.de}
          </p>
          {promotion.accept_url ? (
            <p>
              <strong>Ссылка «Принять заявку» (для рекламы / Telegram):</strong>{" "}
              {promotion.accept_url}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
