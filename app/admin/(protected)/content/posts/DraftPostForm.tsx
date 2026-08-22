import Link from "next/link";
import type { ContentPost } from "@/lib/content/types";

const inputClass = "mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900";
const labelClass = "block text-sm font-medium text-gray-700";

type DraftPostFormProps = {
  action: (formData: FormData) => Promise<void>;
  post?: ContentPost | null;
};

export function DraftPostForm({ action, post }: DraftPostFormProps) {
  return (
    <form action={action} className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Language
          <select name="lang" defaultValue={post?.lang ?? "ru"} className={inputClass} required>
            <option value="ru">RU</option>
            <option value="ua">UA</option>
            <option value="de">DE</option>
          </select>
        </label>
        <label className={labelClass}>
          Content type
          <select name="content_type" defaultValue={post?.content_type ?? "guide"} className={inputClass} required>
            <option value="specialist_story">Specialist story</option>
            <option value="freuly_news">Freuly news</option>
            <option value="guide">Guide</option>
            <option value="entrepreneur_life">Entrepreneur life</option>
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Title
        <input name="title" defaultValue={post?.title ?? ""} className={inputClass} required />
      </label>

      <label className={labelClass}>
        Slug
        <input name="slug" defaultValue={post?.slug ?? ""} className={inputClass} placeholder="ascii-slug-only" required />
      </label>

      <label className={labelClass}>
        Excerpt
        <textarea name="excerpt" defaultValue={post?.excerpt ?? ""} rows={3} className={inputClass} />
      </label>

      <label className={labelClass}>
        Hero image URL
        <input name="hero_image_url" defaultValue={post?.hero_image_url ?? ""} className={inputClass} />
      </label>

      <label className={labelClass}>
        Body markdown
        <textarea name="body_markdown" defaultValue={post?.body_markdown ?? ""} rows={18} className={`${inputClass} font-mono`} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          SEO title
          <input name="seo_title" defaultValue={post?.seo_title ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          SEO description
          <input name="seo_description" defaultValue={post?.seo_description ?? ""} className={inputClass} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          CTA type
          <select name="cta_type" defaultValue={post?.cta_type ?? "none"} className={inputClass}>
            <option value="none">None</option>
            <option value="search">Search</option>
            <option value="specialist">Specialist</option>
            <option value="become_specialist">Become specialist</option>
          </select>
        </label>
        <label className={labelClass}>
          CTA label
          <input name="cta_label" defaultValue={post?.cta_label ?? ""} className={inputClass} />
        </label>
        <label className={labelClass}>
          CTA href
          <input name="cta_href" defaultValue={post?.cta_href ?? ""} className={inputClass} />
        </label>
      </div>

      <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
        <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Save draft
        </button>
        <Link href="/admin/content/posts" className="text-sm font-medium text-gray-600 hover:text-gray-900">
          Back to posts
        </Link>
      </div>
    </form>
  );
}
