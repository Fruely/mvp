import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminPost } from "@/lib/content/queries";
import {
  publishPostAction,
  unpublishPostAction,
  updateDraftPostAction,
} from "@/lib/content/adminActions";
import { DraftPostForm } from "../DraftPostForm";
import { DeletePostButton } from "../DeletePostButton";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ unpublished?: string }>;
};

export default async function EditContentPostPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { unpublished } = await searchParams;
  const post = await getAdminPost(id);
  if (!post) notFound();

  const isDraft = post.status === "draft";
  const showUnpublishedNotice = unpublished === "1" && isDraft;

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-[640px] space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-freuly-text-primary">
              {isDraft ? "Редактирование" : "Публикация"}
            </h1>
            <p className="mt-1 text-[14px] text-freuly-text-secondary">
              {isDraft
                ? "Черновик Freuly Journal. Сохраните изменения или опубликуйте статью."
                : "Статья опубликована. Снимите с публикации, чтобы вернуть её в черновик."}
            </p>
            <Link
              href={`/${post.lang}/blog`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[13px] text-freuly-primary hover:underline"
            >
              Открыть Journal ↗
            </Link>
          </div>
          <span
            className={`inline-flex items-center rounded-freuly-sm px-2.5 py-1 text-[12px] font-medium ${
              isDraft
                ? "bg-freuly-page text-freuly-text-secondary"
                : "bg-freuly-primary text-white"
            }`}
          >
            {isDraft ? "Черновик" : "Опубликовано"}
          </span>
        </div>

        {showUnpublishedNotice ? (
          <div className="rounded-freuly-lg border border-freuly-primary/20 bg-freuly-primary-light px-4 py-3 text-[14px] text-freuly-text-primary">
            Публикация снята. Статья сохранена как черновик и больше не видна на сайте.
          </div>
        ) : null}

        {isDraft ? (
          <DraftPostForm
            action={updateDraftPostAction}
            post={post}
            publishAction={publishPostAction}
          />
        ) : (
          <div className="flex flex-col gap-6 rounded-freuly-lg border border-freuly-border-default bg-white p-8">
            <div className="flex flex-col gap-3">
              <h2 className="text-[18px] font-semibold text-freuly-text-primary">{post.title}</h2>
              {post.excerpt && (
                <p className="text-[14px] text-freuly-text-secondary">{post.excerpt}</p>
              )}
              <p className="text-[13px] text-[#9b9b9b]">
                Slug: <span className="font-mono">{post.slug}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <form action={unpublishPostAction}>
                <input type="hidden" name="id" value={post.id} />
                <button
                  type="submit"
                  className="h-[40px] rounded-freuly-button border border-freuly-border-default px-5 text-[14px] font-semibold text-freuly-primary hover:bg-gray-50"
                >
                  Снять с публикации
                </button>
              </form>
              <Link
                href={`/${post.lang}/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] font-semibold text-freuly-primary hover:underline"
              >
                Открыть статью ↗
              </Link>
            </div>

            <div className="border-t border-freuly-border-default pt-6">
              <p className="text-[13px] font-semibold text-freuly-text-secondary">Опасная зона</p>
              <p className="mt-1 text-[13px] text-freuly-text-secondary">
                Полное удаление публикации без возможности восстановления.
              </p>
              <div className="mt-4">
                <DeletePostButton postId={post.id} postTitle={post.title} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
