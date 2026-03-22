import type { Metadata } from "next";

const DOMAIN = "https://freuly.de";

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  const { lang, slug } = params;
  const label = slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${label} — специалисты | Freuly`,
    description: `Найдите специалистов категории ${label} на платформе Freuly.`,
    alternates: {
      canonical: `${DOMAIN}/${lang}/category/${slug}`,
    },
  };
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
