"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertAdminSession } from "@/lib/adminSession";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONTENT_LANGS, CONTENT_TYPES } from "@/lib/content/types";
import { isValidContentSlug } from "@/lib/content/slug";

const CTA_TYPES = ["none", "search", "specialist", "become_specialist"] as const;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function nullable(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value.length > 0 ? value : null;
}

function parseDraft(formData: FormData) {
  const lang = text(formData, "lang");
  const contentType = text(formData, "content_type");
  const ctaType = text(formData, "cta_type");
  const title = text(formData, "title");
  const slug = text(formData, "slug").toLowerCase();

  if (!CONTENT_LANGS.includes(lang as (typeof CONTENT_LANGS)[number])) throw new Error("INVALID_LANG");
  if (!CONTENT_TYPES.includes(contentType as (typeof CONTENT_TYPES)[number])) throw new Error("INVALID_CONTENT_TYPE");
  if (!CTA_TYPES.includes(ctaType as (typeof CTA_TYPES)[number])) throw new Error("INVALID_CTA_TYPE");
  if (!title) throw new Error("TITLE_REQUIRED");
  if (!isValidContentSlug(slug)) throw new Error("INVALID_SLUG");

  return {
    lang,
    slug,
    title,
    excerpt: text(formData, "excerpt"),
    body_markdown: text(formData, "body_markdown"),
    content_type: contentType,
    status: "draft",
    hero_image_url: nullable(formData, "hero_image_url"),
    seo_title: nullable(formData, "seo_title"),
    seo_description: nullable(formData, "seo_description"),
    cta_type: ctaType,
    cta_label: nullable(formData, "cta_label"),
    cta_href: nullable(formData, "cta_href"),
    updated_at: new Date().toISOString(),
  };
}

export async function createDraftPostAction(formData: FormData): Promise<void> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();
  const payload = parseDraft(formData);

  const { data, error } = await supabase
    .from("content_posts")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[admin/content] create draft failed", error);
    throw new Error("CREATE_DRAFT_FAILED");
  }

  revalidatePath("/admin/content/posts");
  redirect(`/admin/content/posts/${data.id}`);
}

export async function updateDraftPostAction(formData: FormData): Promise<void> {
  await assertAdminSession();
  const id = text(formData, "id");
  if (!id) throw new Error("ID_REQUIRED");

  const supabase = createSupabaseServerClient();
  const payload = parseDraft(formData);
  const { data, error } = await supabase
    .from("content_posts")
    .update(payload)
    .eq("id", id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/content] update draft failed", error);
    throw new Error("UPDATE_DRAFT_FAILED");
  }
  if (!data) throw new Error("DRAFT_NOT_FOUND_OR_READ_ONLY");

  revalidatePath("/admin/content/posts");
  revalidatePath(`/admin/content/posts/${id}`);
  redirect(`/admin/content/posts/${id}`);
}

export async function publishPostAction(formData: FormData): Promise<void> {
  await assertAdminSession();
  const id = text(formData, "id");
  if (!id) throw new Error("ID_REQUIRED");

  const supabase = createSupabaseServerClient();
  const { data: current, error: currentError } = await supabase
    .from("content_posts")
    .select("id, status, published_at")
    .eq("id", id)
    .maybeSingle();

  if (currentError) {
    console.error("[admin/content] read before publish failed", currentError);
    throw new Error("PUBLISH_READ_FAILED");
  }
  if (!current || current.status !== "draft") throw new Error("POST_NOT_DRAFT");

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_posts")
    .update({
      status: "published",
      published_at: current.published_at ?? nowIso,
      updated_at: nowIso,
    })
    .eq("id", id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/content] publish failed", error);
    throw new Error("PUBLISH_FAILED");
  }
  if (!data) throw new Error("PUBLISH_CONFLICT");

  revalidatePath("/admin/content/posts");
  revalidatePath(`/admin/content/posts/${id}`);
  redirect(`/admin/content/posts/${id}`);
}

export async function unpublishPostAction(formData: FormData): Promise<void> {
  await assertAdminSession();
  const id = text(formData, "id");
  if (!id) throw new Error("ID_REQUIRED");

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_posts")
    .update({ status: "draft", updated_at: nowIso })
    .eq("id", id)
    .eq("status", "published")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/content] unpublish failed", error);
    throw new Error("UNPUBLISH_FAILED");
  }
  if (!data) throw new Error("POST_NOT_PUBLISHED");

  revalidatePath("/admin/content/posts");
  revalidatePath(`/admin/content/posts/${id}`);
  redirect(`/admin/content/posts/${id}`);
}
