import { notFound } from "next/navigation";
import { getAdminPost } from "@/lib/content/queries";
import { updateDraftPostAction } from "@/lib/content/adminActions";
import { DraftPostForm } from "../DraftPostForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditContentPostPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  const isDraft = post.status === "draft";

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit post</h1>
          <p className="mt-1 text-sm text-gray-600">
            {isDraft ? "Draft changes only. Publishing is handled separately." : "Published posts are read-only in this pass."}
          </p>
        </div>

        {isDraft ? (
          <DraftPostForm action={updateDraftPostAction} post={post} />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This post is published and cannot be edited by the draft editor.
          </div>
        )}
      </div>
    </div>
  );
}
