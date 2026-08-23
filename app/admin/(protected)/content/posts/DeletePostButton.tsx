"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePostAction, type ContentAdminActionError } from "@/lib/content/adminActions";

const ERROR_MESSAGES: Record<ContentAdminActionError["error"], string> = {
  POST_NOT_FOUND: "Публикация не найдена или уже удалена.",
  DELETE_FAILED: "Не удалось удалить публикацию. Попробуйте ещё раз.",
  UNPUBLISH_FAILED: "Не удалось снять публикацию.",
  POST_NOT_PUBLISHED: "Публикация уже не опубликована.",
};

type DeletePostButtonProps = {
  postId: string;
  postTitle: string;
};

export function DeletePostButton({ postId, postTitle }: DeletePostButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Удалить публикацию «${postTitle}»?\n\nЭто действие необратимо. Статья и связанное изображение будут удалены без возможности восстановления.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", postId);

      const result = await deletePostAction(formData);
      if (result && "error" in result) {
        setError(ERROR_MESSAGES[result.error]);
        return;
      }

      router.push("/admin/content/posts");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="h-[40px] rounded-freuly-button border border-freuly-error/30 bg-white px-5 text-[14px] font-semibold text-freuly-error hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Удаление..." : "Удалить публикацию"}
      </button>
      {error ? (
        <p className="text-[13px] text-freuly-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
