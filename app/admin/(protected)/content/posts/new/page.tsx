import { createDraftPostAction, publishPostAction } from "@/lib/content/adminActions";
import { DraftPostForm } from "../DraftPostForm";

export default function NewContentPostPage() {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-semibold text-freuly-text-primary">
              Новая публикация
            </h1>
            <p className="mt-1 text-[14px] text-freuly-text-secondary">
              Создайте и опубликуйте статью для Freuly Journal
            </p>
          </div>
          <span className="inline-flex items-center rounded-freuly-sm bg-freuly-page px-2.5 py-1 text-[12px] font-medium text-freuly-text-secondary">
            Черновик
          </span>
        </div>
        <DraftPostForm action={createDraftPostAction} publishAction={publishPostAction} />
      </div>
    </div>
  );
}
