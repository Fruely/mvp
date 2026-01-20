import { redirect } from "next/navigation";
import { isSupportedLang } from "@/lib/i18n";

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) {
    redirect("/ua");
  }

  return children;
}
