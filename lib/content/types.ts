export const CONTENT_LANGS = ["ru", "ua", "de"] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

export const CONTENT_TYPES = [
  "specialist_story",
  "freuly_news",
  "guide",
  "entrepreneur_life",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export type ContentStatus = "draft" | "published";
export type ContentCtaType = "none" | "search" | "specialist" | "become_specialist";

export type ContentPost = {
  id: string;
  lang: ContentLang;
  slug: string;
  title: string;
  excerpt: string;
  body_markdown: string;
  content_type: ContentType;
  status: ContentStatus;
  hero_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  cta_type: ContentCtaType;
  cta_label: string | null;
  cta_href: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentPostListItem = Pick<
  ContentPost,
  | "id"
  | "lang"
  | "slug"
  | "title"
  | "excerpt"
  | "content_type"
  | "status"
  | "hero_image_url"
  | "published_at"
  | "created_at"
  | "updated_at"
>;

export function isContentLang(value: string): value is ContentLang {
  return CONTENT_LANGS.includes(value as ContentLang);
}
