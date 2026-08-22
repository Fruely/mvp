import "server-only";

import { assertAdminSession } from "@/lib/adminSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidContentSlug } from "@/lib/content/slug";
import type { ContentLang, ContentPost, ContentPostListItem } from "@/lib/content/types";

const LIST_SELECT =
  "id, lang, slug, title, excerpt, content_type, status, hero_image_url, published_at, created_at, updated_at";

const DETAIL_SELECT =
  "id, lang, slug, title, excerpt, body_markdown, content_type, status, hero_image_url, seo_title, seo_description, cta_type, cta_label, cta_href, published_at, created_at, updated_at";

export async function getPublishedPosts(lang: ContentLang): Promise<ContentPostListItem[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select(LIST_SELECT)
    .eq("lang", lang)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[content] published list failed", error);
    throw new Error("CONTENT_LIST_FAILED");
  }

  return (data ?? []) as ContentPostListItem[];
}

export async function getPublishedPost(
  lang: ContentLang,
  slug: string,
): Promise<ContentPost | null> {
  if (!isValidContentSlug(slug)) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select(DETAIL_SELECT)
    .eq("lang", lang)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[content] published detail failed", error);
    throw new Error("CONTENT_DETAIL_FAILED");
  }

  return (data as ContentPost | null) ?? null;
}

export async function getLatestPublishedPosts(
  lang: ContentLang,
  limit: number,
): Promise<ContentPostListItem[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 20));
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select(LIST_SELECT)
    .eq("lang", lang)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("[content] latest list failed", error);
    throw new Error("CONTENT_LATEST_FAILED");
  }

  return (data ?? []) as ContentPostListItem[];
}

export async function getAdminPosts(): Promise<ContentPostListItem[]> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select(LIST_SELECT)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[admin/content] list failed", error);
    throw new Error("ADMIN_CONTENT_LIST_FAILED");
  }

  return (data ?? []) as ContentPostListItem[];
}

export async function getAdminPost(id: string): Promise<ContentPost | null> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/content] detail failed", error);
    throw new Error("ADMIN_CONTENT_DETAIL_FAILED");
  }

  return (data as ContentPost | null) ?? null;
}
