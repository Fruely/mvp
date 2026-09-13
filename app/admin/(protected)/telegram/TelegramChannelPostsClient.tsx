"use client";

import { useState } from "react";

type TelegramChannelPost = {
  id: string;
  title: string | null;
  body_text: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  telegram_message_id: number | null;
  error_message: string | null;
  created_at: string;
};

type Props = {
  initialPosts: TelegramChannelPost[];
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ru-RU");
}

function toLocalInputValue(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function TelegramChannelPostsClient({ initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [generationTopic, setGenerationTopic] = useState("");
  const [generationContext, setGenerationContext] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  async function generateDraft() {
    setIsGenerating(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/telegram/channel-posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: generationTopic,
          context: generationContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Не удалось сгенерировать пост");

      setTitle(typeof data.title === "string" ? data.title : "Сгенерированный пост");
      setBodyText(typeof data.body_text === "string" ? data.body_text : "");
      setMessage("Черновик сгенерирован. Проверь текст перед публикацией.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка генерации");
    } finally {
      setIsGenerating(false);
    }
  }

  async function createPost(status: "draft" | "scheduled") {
    setIsSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/telegram/channel-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body_text: bodyText,
          status,
          scheduled_at:
            status === "scheduled" ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Не удалось сохранить пост");

      setPosts((current) => [data.post, ...current]);
      setTitle("");
      setBodyText("");
      setMessage(status === "scheduled" ? "Пост поставлен в очередь." : "Черновик сохранен.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  }

  async function publishNow(id: string) {
    setPublishingId(id);
    setMessage("");

    try {
      const res = await fetch(`/api/admin/telegram/channel-posts/${id}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Не удалось опубликовать пост");

      setPosts((current) =>
        current.map((post) => (post.id === id ? data.post : post))
      );
      setMessage("Пост опубликован в Telegram.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка публикации");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-base font-semibold text-gray-900">Новый пост</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <h3 className="text-sm font-semibold text-gray-900">AI-черновик</h3>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Тема</span>
                <input
                  value={generationTopic}
                  onChange={(event) => setGenerationTopic(event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Например: шапка Instagram, почему нет заявок"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Контекст или пожелания
                </span>
                <textarea
                  value={generationContext}
                  onChange={(event) => setGenerationContext(event.target.value)}
                  className="mt-1 min-h-[90px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  maxLength={1200}
                  placeholder="Необязательно: что обязательно упомянуть, какую нишу взять, какой тон усилить..."
                />
              </label>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void generateDraft()}
                className="rounded-md border border-gray-900 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Генерирую..." : "Сгенерировать пост"}
              </button>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Заголовок для себя</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Например: первый пост про упаковку"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Текст поста</span>
            <textarea
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              className="mt-1 min-h-[280px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              maxLength={4096}
              placeholder="Текст, который уйдет в Telegram..."
            />
            <span className="mt-1 block text-xs text-gray-500">
              {bodyText.trim().length}/4096
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Время публикации</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSaving || isGenerating || !bodyText.trim()}
              onClick={() => void createPost("draft")}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Сохранить черновик
            </button>
            <button
              type="button"
              disabled={isSaving || isGenerating || !bodyText.trim()}
              onClick={() => void createPost("scheduled")}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Поставить в очередь
            </button>
          </div>

          {message && <p className="text-sm text-gray-700">{message}</p>}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-base font-semibold text-gray-900">Очередь и история</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {posts.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Постов пока нет.</p>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {post.title || "Без заголовка"}
                    </h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                      {post.status}
                    </p>
                  </div>
                  {post.status !== "published" && (
                    <button
                      type="button"
                      disabled={publishingId === post.id}
                      onClick={() => void publishNow(post.id)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Опубликовать
                    </button>
                  )}
                </div>
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-gray-700">
                  {post.body_text}
                </p>
                <div className="mt-3 space-y-1 text-xs text-gray-500">
                  <p>Запланировано: {formatDateTime(post.scheduled_at)}</p>
                  <p>Опубликовано: {formatDateTime(post.published_at)}</p>
                  {post.error_message && (
                    <p className="text-red-600">Ошибка: {post.error_message}</p>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
