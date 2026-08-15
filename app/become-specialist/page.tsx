import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { langFromCookie } from "@/lib/i18n";

const LANG_COOKIE = "freuly_lang";

export default async function BecomeSpecialistRedirect() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LANG_COOKIE)?.value;
  redirect(`/${langFromCookie(raw)}/become-specialist`);
}
