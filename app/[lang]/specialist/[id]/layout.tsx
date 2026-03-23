import type { Metadata } from "next";

const DOMAIN = "https://freuly.de";

export async function generateMetadata({
  params,
}: {
  params: { lang: string; id: string };
}): Promise<Metadata> {
  const { lang, id } = params;

  return {
    alternates: {
      canonical: `${DOMAIN}/${lang}/specialist/${id}`,
    },
  };
}

export default function SpecialistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
