import { redirect } from "next/navigation";

/** i18n alias for specialist login; canonical route is /login. */
export default function LangLoginPage() {
  redirect("/login");
}
