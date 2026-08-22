"use client";

import Link from "next/link";
import type { ContentPost } from "@/lib/content/types";

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
  return (
    <form action={action} className="flex flex-col gap-8 rounded-freuly-lg border border-freuly-border-default bg-white p-8">
      {post && <input type="hidden" name="id" value={post.id} />}

      {/* PRIMARY FIELDS */}
      <div className="flex flex-col gap-5">
        <label className={labelClass}>
          Заголовок
          <input
            name="title"
            defaultValue={post?.title ?? ""}
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

        <label className={labelClass}>
          Изображение
          <input
            name="hero_image_url"
            defaultValue={post?.hero_image_url ?? ""}
            className={inputClass}
            placeholder="URL изображения (загрузка — в будущем обновлении)"
          />
        </label>

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
            defaultValue={post?.slug ?? ""}
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
