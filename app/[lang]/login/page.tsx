import { redirect } from "next/navigation";

type Props = {
  searchParams?: { next?: string } | Promise<{ next?: string }>;
};

/** i18n alias for specialist login; canonical route is /login. */
export default async function LangLoginPage({ searchParams }: Props) {
  const resolved = await Promise.resolve(searchParams ?? {});
  const next = typeof resolved.next === "string" ? resolved.next : null;
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  redirect(`/login${qs}`);
}
