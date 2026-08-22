import { createDraftPostAction } from "@/lib/content/adminActions";
import { DraftPostForm } from "../DraftPostForm";

export default function NewContentPostPage() {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">New post</h1>
          <p className="mt-1 text-sm text-gray-600">Create a draft only. Publishing is handled separately.</p>
        </div>
        <DraftPostForm action={createDraftPostAction} />
      </div>
    </div>
  );
}
