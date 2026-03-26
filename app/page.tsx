import HomeClient from "./[lang]/HomeClient";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const DOMAIN = "https://freuly.de";

export async function generateMetadata() {
  return {
    alternates: {
      canonical: DOMAIN,
      languages: {
        uk: `${DOMAIN}/ua`,
        ru: `${DOMAIN}/ru`,
        de: `${DOMAIN}/de`,
      },
    },
  };
}

export default async function RootPage() {
  const dict = await getDictionary("ua");
  return <HomeClient lang="ua" dict={dict} />;
}
