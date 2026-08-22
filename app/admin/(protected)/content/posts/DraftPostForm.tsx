"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import type { ContentPost } from "@/lib/content/types";
import { generateSlugFromTitle } from "@/lib/content/slug";
import {
  uploadContentImageAction,
  removeContentImageAction,
} from "@/lib/content/imageUpload";

const labelClass = "block text-[13px] font-semibold text-freuly-text-primary";
const inputClass =
  "mt-2 h-[44px] w-full rounded-freuly-button border border-freuly-border-default bg-white px-4 text-[14px] text-freuly-text-primary placeholder:text-[#9b9b9b] focus:border-freuly-primary focus:outline-none focus:ring-1 focus:ring-freuly-primary";
const selectClass =
  "mt-2 h-[44px] w-full appearance-none rounded-freuly-button border border-freuly-border-default bg-white px-4 text-[14px] text-freuly-text-primary focus:border-freuly-primary focus:outline-none focus:ring-1 focus:ring-freuly-primary";
const textareaClass =
  "mt-2 w-full rounded-freuly-button border border-freuly-border-default bg-white p-3 text-[14px] text-freuly-text-primary placeholder:text-[#9b9b9b] focus:border-freuly-primary focus:outline-none focus:ring-1 focus:ring-freuly-primary";

type DraftPostFormProps = {
  action: (formData: FormData) => Promise<void>;
  post?: ContentPost | null;
  publishAction?: (formData: FormData) => Promise<void>;
};

export function DraftPostForm({ action, post, publishAction }: DraftPostFormProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post?.slug);
  const [heroUrl, setHeroUrl] = useState(post?.hero_image_url ?? "");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!slugTouched) {
      setSlug(generateSlugFromTitle(newTitle));
    }
  }, [slugTouched]);

  const handleSlugChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugTouched(true);
  }, []);

  const doUpload = useCallback(async (file: File) => {
    const mime = file.type.toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      setUploadState("error");
      setUploadError("Поддерживаются только JPEG, PNG, WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadState("error");
      setUploadError("Файл больше 5 МБ");
      return;
    }

    setUploadState("uploading");
    setUploadError("");

    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadContentImageAction(fd);

    if (result.ok) {
      setHeroUrl(result.url);
      setUploadState("idle");
    } else {
      setUploadState("error");
      setUploadError(result.error === "upload_failed" ? "Ошибка загрузки. Попробуйте снова." : result.error);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = "";
  }, [doUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  }, [doUpload]);

  const handleRemove = useCallback(async () => {
    if (!heroUrl) return;
    const fd = new FormData();
    fd.set("url", heroUrl);
    await removeContentImageAction(fd);
    setHeroUrl("");
  }, [heroUrl]);

  return (
    <form action={action} className="flex flex-col gap-8 rounded-freuly-lg border border-freuly-border-default bg-white p-8">
      {post && <input type="hidden" name="id" value={post.id} />}

      {/* PRIMARY FIELDS */}
      <div className="flex flex-col gap-5">
        <label className={labelClass}>
          Заголовок
          <input
            name="title"
            value={title}
            onChange={handleTitleChange}
            className="mt-2 h-[52px] w-full rounded-freuly-button border border-freuly-border-default bg-white px-4 text-[16px] font-medium text-freuly-text-primary placeholder:text-[#9b9b9b] focus:border-freuly-primary focus:outline-none focus:ring-1 focus:ring-freuly-primary"
            placeholder="Введите заголовок публикации..."
            required
          />
        </label>

        <label className={labelClass}>
          Язык
          <select name="lang" defaultValue={post?.lang ?? "ru"} className={selectClass} required>
            <option value="ru">RU</option>
            <option value="ua">UA</option>
            <option value="de">DE</option>
          </select>
        </label>

        <label className={labelClass}>
          Тип контента
          <select name="content_type" defaultValue={post?.content_type ?? "guide"} className={selectClass} required>
            <option value="specialist_story">История специалиста</option>
            <option value="freuly_news">Новости Freuly</option>
            <option value="guide">Полезный материал</option>
            <option value="entrepreneur_life">Бизнес и жизнь</option>
          </select>
        </label>

        <label className={labelClass}>
          Краткое описание
          <textarea
            name="excerpt"
            defaultValue={post?.excerpt ?? ""}
            rows={3}
            className={textareaClass}
            placeholder="Краткое описание для карточки предпросмотра..."
          />
        </label>

        <div>
          <span className={labelClass}>Изображение</span>
          <input type="hidden" name="hero_image_url" value={heroUrl} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />

          {heroUrl ? (
            <div className="mt-2 overflow-hidden rounded-freuly-lg border border-freuly-border-default">
              <div
                className="h-[160px] w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${heroUrl})` }}
              />
              <div className="flex items-center justify-between border-t border-freuly-border-default px-4 py-2">
                <span className="truncate text-[13px] text-freuly-text-secondary">
                  {heroUrl.split("/").pop()}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[13px] font-semibold text-freuly-primary hover:underline"
                  >
                    Заменить
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="text-[13px] font-semibold text-freuly-error hover:underline"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => uploadState !== "uploading" && fileInputRef.current?.click()}
              className={`mt-2 flex h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-freuly-lg border-2 border-dashed transition-colors ${
                dragOver
                  ? "border-freuly-primary bg-freuly-primary-light"
                  : "border-freuly-border-default bg-white hover:border-freuly-primary"
              }`}
            >
              {uploadState === "uploading" ? (
                <p className="text-[14px] text-freuly-text-secondary">Загрузка...</p>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-freuly-button bg-[#eae9e5]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <path d="M12 8v8M8 12h8"/>
                    </svg>
                  </div>
                  <p className="text-[14px] text-freuly-text-secondary">
                    Нажмите или перетащите файл
                  </p>
                  <p className="text-[12px] text-[#9b9b9b]">
                    JPEG, PNG, WebP. Макс. 5 МБ. Рекомендуемо 16:9
                  </p>
                </>
              )}
            </div>
          )}

          {uploadState === "error" && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-[13px] text-freuly-error">{uploadError}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[13px] font-semibold text-freuly-primary hover:underline"
              >
                Повторить
              </button>
            </div>
          )}
        </div>

        <label className={labelClass}>
          Текст статьи
          <textarea
            name="body_markdown"
            defaultValue={post?.body_markdown ?? ""}
            rows={14}
            className={`${textareaClass} font-mono`}
            placeholder="Начните писать свою историю здесь..."
          />
        </label>
      </div>

      {/* SEO / TECHNICAL SECTION */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold uppercase text-[#9b9b9b]">SEO / Техническое</p>
          <hr className="mt-3 border-freuly-border-default" />
        </div>

        <label className={labelClass}>
          URL (slug)
          <input
            name="slug"
            value={slug}
            onChange={handleSlugChange}
            className={inputClass}
            placeholder="auto-generated"
            required
          />
          <span className="mt-1 block text-[12px] text-[#9b9b9b]">
            Генерируется автоматически из заголовка
          </span>
        </label>

        <label className={labelClass}>
          SEO заголовок
          <input
            name="seo_title"
            defaultValue={post?.seo_title ?? ""}
            className={inputClass}
            placeholder="SEO заголовок для поисковых систем..."
          />
        </label>

        <label className={labelClass}>
          SEO описание
          <textarea
            name="seo_description"
            defaultValue={post?.seo_description ?? ""}
            rows={2}
            className={textareaClass}
            placeholder="Краткое поисковое описание (рекомендуется до 160 символов)..."
          />
        </label>
      </div>

      {/* CTA SECTION */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold uppercase text-[#9b9b9b]">CTA</p>
          <hr className="mt-3 border-freuly-border-default" />
        </div>

        <label className={labelClass}>
          Тип CTA
          <select name="cta_type" defaultValue={post?.cta_type ?? "none"} className={selectClass}>
            <option value="none">Нет</option>
            <option value="search">Найти специалиста</option>
            <option value="specialist">Открыть профиль специалиста</option>
            <option value="become_specialist">Стать специалистом</option>
          </select>
        </label>

        <label className={labelClass}>
          Текст кнопки
          <input
            name="cta_label"
            defaultValue={post?.cta_label ?? ""}
            className={inputClass}
            placeholder="Записаться на бесплатную консультацию"
          />
        </label>

        <label className={labelClass}>
          Ссылка (URL)
          <input
            name="cta_href"
            defaultValue={post?.cta_href ?? ""}
            className={inputClass}
            placeholder="https://freuly.com/cta-link"
          />
        </label>
      </div>

      {/* ACTION BAR */}
      <div className="flex items-center gap-3">
        {publishAction && post ? (
          <button
            type="submit"
            formAction={publishAction}
            className="h-[40px] rounded-freuly-button bg-freuly-primary px-5 text-[14px] font-semibold text-white hover:bg-freuly-primary-hover"
          >
            Опубликовать
          </button>
        ) : null}
        <button
          type="submit"
          className={publishAction && post
            ? "h-[40px] rounded-freuly-button border border-freuly-border-default px-5 text-[14px] font-semibold text-freuly-text-primary hover:bg-gray-50"
            : "h-[40px] rounded-freuly-button bg-freuly-primary px-5 text-[14px] font-semibold text-white hover:bg-freuly-primary-hover"
          }
        >
          Сохранить черновик
        </button>
        <Link
          href="/admin/content/posts"
          className="text-[14px] font-semibold text-freuly-text-secondary hover:text-freuly-text-primary"
        >
          Назад
        </Link>
      </div>
    </form>
  );
}
