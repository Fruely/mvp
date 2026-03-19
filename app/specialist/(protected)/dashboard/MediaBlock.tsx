"use client";

import { useState, useRef, FormEvent } from "react";
import { getDashboardHelpers } from "@/lib/i18n/dashboardHelpers";

type MediaBlockProps = {
  initialPhotoUrl: string;
  initialVideoUrl: string;
  initialGalleryUrls: string[];
  initialCertificateUrls: string[];
};

const MAX_VIDEO_GALLERY = 5;
const MAX_CERTIFICATES = 10;

export default function MediaBlock({
  initialPhotoUrl,
  initialVideoUrl,
  initialGalleryUrls,
  initialCertificateUrls,
}: MediaBlockProps) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl ?? "");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    Array.isArray(initialGalleryUrls) && initialGalleryUrls.length > 0
      ? [...initialGalleryUrls]
      : [""]
  );
  const [certificateUrls, setCertificateUrls] = useState<string[]>(
    Array.isArray(initialCertificateUrls) && initialCertificateUrls.length > 0
      ? [...initialCertificateUrls]
      : [""]
  );
  const [isPending, setIsPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadSuccess(false);
    setUploadPending(true);
    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/specialist/avatar/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setUploadError(data?.error ?? "Не удалось загрузить фото.");
          return;
        }
        if (data.url) {
          setPhotoUrl(data.url);
          setUploadSuccess(true);
          setUploadError(null);
        }
      })
      .catch(() => setUploadError("Не удалось загрузить фото. Попробуйте снова."))
      .finally(() => {
        setUploadPending(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  };

  const addGalleryRow = () => {
    if (galleryUrls.length >= MAX_VIDEO_GALLERY) return;
    setGalleryUrls((prev) => [...prev, ""]);
  };
  const setGalleryAt = (index: number, value: string) => {
    setGalleryUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const removeGalleryAt = (index: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const addCertificateRow = () => {
    if (certificateUrls.length >= MAX_CERTIFICATES) return;
    setCertificateUrls((prev) => [...prev, ""]);
  };
  const setCertificateAt = (index: number, value: string) => {
    setCertificateUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };
  const removeCertificateAt = (index: number) => {
    setCertificateUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    setUploadSuccess(false);
    setIsPending(true);

    const payload = {
      photo_url: photoUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      gallery_urls: galleryUrls.map((u) => u.trim()).filter(Boolean),
      certificate_urls: certificateUrls.map((u) => u.trim()).filter(Boolean),
    };

    fetch("/api/specialist/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErrorMessage(data?.error ?? "Не удалось сохранить. Попробуйте ещё раз.");
          return;
        }
        setSuccessMessage("Аватар, сертификаты, видео и галерея сохранены.");
      })
      .catch(() => {
        setErrorMessage("Не удалось сохранить. Проверьте ссылки и попробуйте снова.");
      })
      .finally(() => setIsPending(false));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          Аватар, сертификаты, видео и галерея работ
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Ссылки на уже размещённые в интернете файлы. Фото — любая ссылка на
          изображение. Видео — только YouTube или Vimeo.
        </p>
      </div>

      {/* Avatar / main photo */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Аватар (главное фото на карточке и в ротации)
        </label>
        <div className="flex flex-col sm:flex-row gap-4">
          {photoUrl && (
            <div className="flex-shrink-0 w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="Текущий аватар"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
          <div className="flex-1">
            <input
              type="url"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://... (ссылка на фото)"
            />
          </div>
        </div>
        <p className="text-xs text-textSecondary">
          Вставьте ссылку на фото или загрузите файл с устройства — он заменит
          текущий аватар.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <button
            type="button"
            disabled={uploadPending}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-70"
          >
            {uploadPending ? "Загрузка…" : "Загрузить фото с устройства"}
          </button>
          {uploadSuccess && (
            <span className="text-sm font-medium text-emerald-600">
              Аватар обновлён
            </span>
          )}
          {uploadError && (
            <span className="text-sm text-red-600">{uploadError}</span>
          )}
        </div>
      </div>

      {/* Certificate photos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Фото сертификатов (до {MAX_CERTIFICATES} ссылок)
          </label>
          {certificateUrls.length < MAX_CERTIFICATES && (
            <button
              type="button"
              onClick={addCertificateRow}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              + Добавить сертификат
            </button>
          )}
        </div>
        <div className="space-y-2">
          {certificateUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={url}
                onChange={(e) => setCertificateAt(index, e.target.value)}
                placeholder="https://... (ссылка на фото сертификата)"
              />
              <button
                type="button"
                onClick={() => removeCertificateAt(index)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                aria-label="Удалить"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-textSecondary">
          Ссылки на изображения сертификатов, дипломов, квалификаций. Они
          отобразятся в блоке «Сертификаты» на вашей карточке.
        </p>
      </div>

      {/* Main video */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Основное видео (YouTube или Vimeo)
        </label>
        <input
          type="url"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/... или https://vimeo.com/..."
        />
        <p className="text-xs text-gray-500 font-medium mt-2">Как добавить видео:</p>
        <p className="text-xs text-gray-500">
          Загрузите видео на YouTube или Vimeo (доступ — «по ссылке» или «публичный»), затем вставьте ссылку сюда.
          Мы не принимаем загрузку видеофайлов напрямую.
        </p>
        <div className="mt-2 space-y-0.5">
          <p className="text-xs text-gray-500">{getDashboardHelpers().video.line1}</p>
          <ul className="text-xs text-gray-500 list-disc list-inside">
            <li>{getDashboardHelpers().video.bullet1}</li>
            <li>{getDashboardHelpers().video.bullet2}</li>
            <li>{getDashboardHelpers().video.bullet3}</li>
          </ul>
          <p className="text-xs text-gray-400 mt-1">{getDashboardHelpers().video.footer}</p>
        </div>
      </div>

      {/* Video gallery (works) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Видеогалерея работ (до {MAX_VIDEO_GALLERY} ссылок)
          </label>
          {galleryUrls.length < MAX_VIDEO_GALLERY && (
            <button
              type="button"
              onClick={addGalleryRow}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              + Добавить видео
            </button>
          )}
        </div>
        <div className="space-y-2">
          {galleryUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="url"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-textSecondary focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                value={url}
                onChange={(e) => setGalleryAt(index, e.target.value)}
                placeholder="https://www.youtube.com/... или https://vimeo.com/..."
              />
              <button
                type="button"
                onClick={() => removeGalleryAt(index)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                aria-label="Удалить"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Дополнительные видео добавляются ссылками на YouTube или Vimeo.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-soft hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Сохранение..." : "Сохранить аватар, сертификаты и видео"}
        </button>
        <div className="flex-1 text-right">
          {successMessage && (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          )}
          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    </form>
  );
}
