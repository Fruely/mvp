import Link from "next/link";
import { getAdminPosts } from "@/lib/content/queries";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toISOString().slice(0, 10);
}

export default async function AdminContentPostsPage() {
  const posts = await getAdminPosts();

  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Hub</h1>
            <p className="mt-1 text-sm text-gray-600">Articles and editorial materials.</p>
          </div>
          <Link
            href="/admin/content/posts/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            New post
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No posts yet.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{post.title}</td>
                      <td className="px-4 py-3 text-gray-700">{post.lang.toUpperCase()}</td>
                      <td className="px-4 py-3 text-gray-700">{post.content_type}</td>
                      <td className="px-4 py-3 text-gray-700">{post.status}</td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(post.published_at)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/content/posts/${post.id}`}
                          className="font-medium text-gray-900 underline underline-offset-2"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
