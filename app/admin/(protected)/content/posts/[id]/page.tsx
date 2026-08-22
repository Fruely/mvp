import { notFound } from "next/navigation";
import { getAdminPost } from "@/lib/content/queries";
import {
  publishPostAction,
  unpublishPostAction,
  updateDraftPostAction,
} from "@/lib/content/adminActions";
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
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit post</h1>
          <p className="mt-1 text-sm text-gray-600">
            {isDraft
              ? "Save draft changes before publishing."
              : "Published posts are read-only until moved back to draft."}
          </p>
        </div>

        {isDraft ? (
          <DraftPostForm action={updateDraftPostAction} post={post} />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This post is published. Move it back to draft before editing its content.
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Publication status</h2>
              <p className="mt-1 text-sm text-gray-600">
                Current status: <span className="font-medium text-gray-900">{post.status}</span>
              </p>
            </div>

            {isDraft ? (
              <form action={publishPostAction}>
                <input type="hidden" name="id" value={post.id} />
                <button
                  type="submit"
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Publish
                </button>
              </form>
            ) : (
              <form action={unpublishPostAction}>
                <input type="hidden" name="id" value={post.id} />
                <button
                  type="submit"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  Move to draft
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
